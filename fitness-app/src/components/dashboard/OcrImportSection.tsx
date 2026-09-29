import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readFunctionErrorMessage } from '../../lib/edgeFunctionError'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { ExerciseCategory, MuscleGroup } from '../../types'
import { MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { normalizeExerciseName, matchAgainstExisting } from '../../lib/textSimilarity'
import { btnPrimary as actionBtnStyle, btnSecondary as ghostBtnStyle, fieldCompact as inlineInputStyle, fieldCompact as inlineSelectStyle } from '../../styles/ui'

const VALID_CATEGORIES: ExerciseCategory[] = [
  'strength', 'olympic', 'gymnastics', 'cardio', 'mobility', 'accessory'
]
// Dérivé du type canonique plutôt que recopié : un muscle ajouté dans
// types/index.ts devient automatiquement sélectionnable ici.
const VALID_MUSCLES = Object.keys(MUSCLE_GROUP_I18N_KEYS) as MuscleGroup[]

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Force', olympic: 'Haltéro', gymnastics: 'Gymn.', cardio: 'Cardio',
  mobility: 'Mobilité', accessory: 'Accessoire'
}
const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  chest: 'Pecto', back: 'Dos', traps: 'Trapèzes', shoulders: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', forearms: 'Avant-bras', core: 'Abdos', obliques: 'Obliques',
  lower_back: 'Lombaires', glutes: 'Fessiers',
  quads: 'Quads', hamstrings: 'Ischios', adductors: 'Adducteurs',
  calves: 'Mollets', tibialis: 'Jambier',
  cardio_upper: 'Cardio H.', cardio_lower: 'Cardio B.'
}

type RowStatus = 'pending' | 'importing' | 'done' | 'error' | 'duplicate' | 'similar'

type OcrRow = {
  uid: string
  name: string
  category: ExerciseCategory
  primary_muscle: MuscleGroup
  description: string
  source: string
  selected: boolean
  status: RowStatus
  error?: string
}

/** Une image à analyser : soit un fichier déposé tel quel, soit une page de PDF rendue en JPEG. */
type QueueItem = {
  qid: string
  label: string
  file: File
}

function sanitizeCat(v: unknown): ExerciseCategory {
  return VALID_CATEGORIES.includes(v as ExerciseCategory)
    ? (v as ExerciseCategory)
    : 'strength'
}
function sanitizeMuscle(v: unknown): MuscleGroup {
  return VALID_MUSCLES.includes(v as MuscleGroup) ? (v as MuscleGroup) : 'core'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Analyse une image via la fonction Edge `ocr-import` (Gemini côté serveur —
 * voir docs/import-ocr.md). Ne fait aucun tri par nom : la détection de
 * doublon se fait après coup, une fois qu'on a la liste complète.
 */
async function analyzeImage(file: File, source: string): Promise<Omit<OcrRow, 'selected' | 'status'>[]> {
  const base64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke('ocr-import', {
    body: { base64, mimeType: file.type }
  })
  if (error) {
    const detail = await readFunctionErrorMessage(error)
    throw new Error(detail ?? error.message ?? 'Erreur OCR')
  }
  const raw = ((data as { rows?: unknown[] })?.rows ?? []) as Array<Record<string, unknown>>
  return raw
    .map((r, i) => ({
      uid: `${Date.now()}-${i}-${Math.random()}`,
      name: String(r.name ?? '').trim(),
      category: sanitizeCat(r.category),
      primary_muscle: sanitizeMuscle(r.primary_muscle),
      description: String(r.description ?? '').trim(),
      source
    }))
    .filter((r) => r.name.length > 0)
}

interface Props {
  /** Noms bruts (pas encore normalisés) des exercices déjà en bibliothèque. */
  existingNames: string[]
}

export default function OcrImportSection({ existingNames }: Props) {
  const { createExercise } = useExerciseStore()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('')
  const [rows, setRows] = useState<OcrRow[]>([])
  const [failedItems, setFailedItems] = useState<{ item: QueueItem; message: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | File[]) {
    const accepted = Array.from(list).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (accepted.length === 0) return
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...accepted.filter((f) => !names.has(f.name))]
    })
    setError(null)
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  /** Applique la détection de doublon/similarité sur un lot de lignes fraîchement extraites. */
  function classify(newRows: Omit<OcrRow, 'selected' | 'status'>[]): OcrRow[] {
    const existingNormalized = existingNames.map(normalizeExerciseName)
    return newRows.map((r) => {
      const match = matchAgainstExisting(r.name, existingNormalized)
      return {
        ...r,
        selected: match !== 'exact',
        status: match === 'exact' ? 'duplicate' : match === 'similar' ? 'similar' : 'pending'
      }
    })
  }

  /** PDF → une page par image ; image seule → elle-même. Un PDF illisible devient un échec isolé, pas un blocage du lot. */
  async function buildQueue(source: File[]): Promise<{ queue: QueueItem[]; prepErrors: { item: QueueItem; message: string }[] }> {
    const queue: QueueItem[] = []
    const prepErrors: { item: QueueItem; message: string }[] = []

    for (const file of source) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        queue.push({ qid: `${file.name}-${file.lastModified}`, label: file.name, file })
        continue
      }
      try {
        const { pdfToImages } = await import('../../lib/pdfToImages')
        const pages = await pdfToImages(file)
        for (const [i, page] of pages.entries()) {
          queue.push({ qid: `${file.name}-${file.lastModified}-p${i}`, label: page.label, file: page.file })
        }
      } catch (err) {
        const placeholder: QueueItem = { qid: `${file.name}-${file.lastModified}`, label: file.name, file }
        prepErrors.push({ item: placeholder, message: err instanceof Error ? err.message : 'PDF illisible' })
      }
    }
    return { queue, prepErrors }
  }

  async function runQueue(queue: QueueItem[]) {
    const newRows: Omit<OcrRow, 'selected' | 'status'>[] = []
    const failures: { item: QueueItem; message: string }[] = []

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      setProcessingMsg(`${i + 1}/${queue.length} — ${item.label}`)
      try {
        const extracted = await analyzeImage(item.file, item.label)
        newRows.push(...extracted)
      } catch (err) {
        failures.push({ item, message: err instanceof Error ? err.message : 'Erreur OCR' })
      }
    }
    return { newRows, failures }
  }

  async function processImages() {
    if (files.length === 0) return
    setProcessing(true)
    setError(null)
    setRows([])
    setFailedItems([])

    setProcessingMsg('Préparation des fichiers...')
    const { queue, prepErrors } = await buildQueue(files)

    const { newRows, failures } = await runQueue(queue)

    setRows(classify(newRows))
    setFailedItems([...prepErrors, ...failures])
    setProcessing(false)
    setProcessingMsg('')
  }

  async function retryFailed() {
    if (failedItems.length === 0) return
    setProcessing(true)
    const queue = failedItems.map((f) => f.item)
    setFailedItems([])

    const { newRows, failures } = await runQueue(queue)

    setRows((prev) => [...prev, ...classify(newRows)])
    setFailedItems(failures)
    setProcessing(false)
    setProcessingMsg('')
  }

  async function importRows(target: OcrRow[]) {
    if (target.length === 0) return
    setImporting(true)

    for (const row of target) {
      setRows((prev) => prev.map((r) => (r.uid === row.uid ? { ...r, status: 'importing' } : r)))
      try {
        await createExercise({
          name: row.name,
          description: row.description,
          category: row.category,
          body_region: 'full',
          movement_type: null,
          secondary_movements: [],
          methods: [],
          primary_muscle: row.primary_muscle,
          secondary_muscles: [],
          tertiary_muscles: [],
          video_url: null,
          video_path: null
        })
        setRows((prev) => prev.map((r) => (r.uid === row.uid ? { ...r, status: 'done' } : r)))
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.uid === row.uid
              ? { ...r, status: 'error', error: err instanceof Error ? err.message : 'Erreur' }
              : r
          )
        )
      }
    }

    setImporting(false)
  }

  function importSelected() {
    return importRows(rows.filter((r) => r.selected && r.status === 'pending'))
  }

  function retryErrors() {
    const failed = rows.filter((r) => r.status === 'error')
    setRows((prev) => prev.map((r) => (r.status === 'error' ? { ...r, status: 'pending', error: undefined } : r)))
    return importRows(failed.map((r) => ({ ...r, status: 'pending' as const })))
  }

  function toggleRow(uid: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.uid === uid && (r.status === 'pending' || r.status === 'duplicate' || r.status === 'similar')
          ? { ...r, selected: !r.selected, status: r.status === 'duplicate' || r.status === 'similar' ? 'pending' : r.status }
          : r
      )
    )
  }

  function updateRow(uid: string, field: 'name' | 'category' | 'primary_muscle' | 'description', value: string) {
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r))
    )
  }

  const selectedCount = rows.filter((r) => r.selected && r.status === 'pending').length
  const doneCount = rows.filter((r) => r.status === 'done').length
  const errorCount = rows.filter((r) => r.status === 'error').length
  const dupeCount = rows.filter((r) => r.status === 'duplicate').length
  const similarCount = rows.filter((r) => r.status === 'similar').length
  const allImported = rows.length > 0 && rows.every((r) => r.status === 'done' || r.status === 'duplicate' || r.status === 'similar')

  return (
    <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', background: 'var(--dark)' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{
          fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--black)', background: 'var(--orange)',
          padding: '0.2rem 0.5rem', flexShrink: 0
        }}>
          OCR
        </span>
        <span style={{
          fontFamily: 'var(--font-d)', fontSize: '0.8125rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white)'
        }}>
          Import rapide — Photos ou PDF de feuilles d'entraînement
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.8125rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
          {/* Prise de photo — bouton dédié : un <input capture> avec `multiple` ou un
              accept incluant le PDF perd son comportement caméra sur la plupart des
              navigateurs mobiles et retombe sur la galerie. Deux entrées séparées,
              donc, plutôt qu'une seule qui ferait mal les deux choses. */}
          {rows.length === 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{ ...actionBtnStyle, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                📷 Prendre une photo
              </button>
              <button onClick={() => inputRef.current?.click()} style={ghostBtnStyle}>
                Choisir des fichiers (photos, PDF)
              </button>
            </div>
          )}

          {/* Drop zone */}
          {rows.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                addFiles(e.dataTransfer.files)
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--orange)' : 'var(--border)'}`,
                background: dragOver ? 'rgba(255,77,0,0.05)' : 'var(--black)',
                padding: 'var(--page-pad)', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s', marginBottom: '1rem'
              }}
            >
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                Ou dépose tes photos ou PDF ici
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginTop: '0.4rem', opacity: 0.6 }}>
                JPG · PNG · WEBP · PDF (chaque page est analysée séparément) — feuilles d'entraînement des 6 dernières années
              </p>
            </div>
          )}
          {/* Prise de photo directe (mobile). Un seul cliché à la fois : demander
              `multiple` avec `capture` fait échouer l'ouverture caméra sur plusieurs
              navigateurs Android — mieux vaut reprendre le bouton pour la suivante. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          {/* File list */}
          {files.length > 0 && rows.length === 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {files.map((f) => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--black)', border: '1px solid var(--border)', marginBottom: '0.3rem' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: '0.8125rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', color: 'var(--muted)', marginLeft: '0.5rem', flexShrink: 0 }}>
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button onClick={() => removeFile(f.name)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8125rem', padding: '0 0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                style={{ ...ghostBtnStyle, fontSize: '0.6875rem', marginTop: '0.3rem' }}
              >
                + Ajouter d'autres fichiers
              </button>
            </div>
          )}

          {/* Process / status */}
          {files.length > 0 && rows.length === 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={processImages}
                disabled={processing || files.length === 0}
                style={{ ...actionBtnStyle, opacity: processing || files.length === 0 ? 0.6 : 1 }}
              >
                {processing ? '...' : `Analyser ${files.length} fichier${files.length > 1 ? 's' : ''}`}
              </button>
              {processing && (
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {processingMsg}
                </span>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(255,77,0,0.08)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          {/* Fichiers en échec — analyse seulement, avant tout import */}
          {failedItems.length > 0 && (
            <div style={{ marginTop: rows.length > 0 ? '0.75rem' : 0, marginBottom: '0.75rem', border: '1px solid rgba(255,77,0,0.3)', background: 'rgba(255,77,0,0.05)', padding: '0.75rem 0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                  {failedItems.length} fichier{failedItems.length > 1 ? 's' : ''} en échec
                </span>
                <button
                  onClick={() => { void retryFailed() }}
                  disabled={processing}
                  style={{ ...ghostBtnStyle, fontSize: '0.6875rem', marginLeft: 'auto' }}
                >
                  {processing ? 'Nouvel essai...' : 'Réessayer'}
                </button>
              </div>
              {failedItems.map(({ item, message }) => (
                <p key={item.qid} style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.15rem 0' }}>
                  {item.label} — {message}
                </p>
              ))}
            </div>
          )}

          {/* Results table */}
          {rows.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {/* Summary chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', padding: '0.15rem 0.45rem' }}>
                  {rows.length} exercices extraits
                </span>
                {dupeCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', padding: '0.15rem 0.45rem' }}>
                    {dupeCount} déjà existants
                  </span>
                )}
                {similarCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.35)', padding: '0.15rem 0.45rem' }}>
                    {similarCount} noms proches d'un exercice existant
                  </span>
                )}
                {doneCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', padding: '0.15rem 0.45rem' }}>
                    ✓ {doneCount} importés
                  </span>
                )}
                {errorCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.35)', padding: '0.15rem 0.45rem' }}>
                    ✕ {errorCount} erreurs
                  </span>
                )}
                <button
                  onClick={() => { setRows([]); setFiles([]); setFailedItems([]) }}
                  style={{ ...ghostBtnStyle, fontSize: '0.6875rem', marginLeft: 'auto' }}
                >
                  Réinitialiser
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,2fr) 90px 110px minmax(0,2fr) 110px 52px', gap: '0', background: 'var(--black)', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.6rem' }}>
                {['', 'Nom', 'Catégorie', 'Muscle', 'Description', 'Source', ''].map((h, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</span>
                ))}
              </div>

              <div style={{ border: '1px solid var(--border)', borderTop: 'none', maxHeight: 340, overflowY: 'auto' }}>
                {rows.map((row) => {
                  const isEditable = row.status === 'pending' || row.status === 'duplicate' || row.status === 'similar'
                  const statusColor =
                    row.status === 'done' ? '#22c55e'
                    : row.status === 'error' ? 'var(--orange)'
                    : row.status === 'importing' ? '#60a5fa'
                    : row.status === 'duplicate' ? '#f59e0b'
                    : row.status === 'similar' ? '#60a5fa'
                    : 'var(--muted)'

                  return (
                    <div
                      key={row.uid}
                      title={row.status === 'error' ? row.error : undefined}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px minmax(0,2fr) 90px 110px minmax(0,2fr) 110px 52px',
                        gap: '0',
                        padding: '0.45rem 0.6rem',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        background: row.status === 'done' ? 'rgba(34,197,94,0.04)'
                          : row.status === 'error' ? 'rgba(255,77,0,0.04)'
                          : row.status === 'duplicate' ? 'rgba(245,158,11,0.04)'
                          : row.status === 'similar' ? 'rgba(96,165,250,0.04)'
                          : 'transparent',
                        opacity: row.status === 'done' || (!row.selected && isEditable) ? 0.55 : 1
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(row.uid)}
                        disabled={!isEditable}
                        style={{ cursor: isEditable ? 'pointer' : 'default', accentColor: 'var(--orange)' }}
                      />

                      {/* Name */}
                      <input
                        value={row.name}
                        onChange={(e) => updateRow(row.uid, 'name', e.target.value)}
                        disabled={!isEditable || !row.selected}
                        style={{ ...inlineInputStyle, fontWeight: 700 }}
                      />

                      {/* Category */}
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.uid, 'category', e.target.value)}
                        disabled={!isEditable || !row.selected}
                        style={inlineSelectStyle}
                      >
                        {VALID_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>

                      {/* Muscle */}
                      <select
                        value={row.primary_muscle}
                        onChange={(e) => updateRow(row.uid, 'primary_muscle', e.target.value)}
                        disabled={!isEditable || !row.selected}
                        style={inlineSelectStyle}
                      >
                        {VALID_MUSCLES.map((m) => (
                          <option key={m} value={m}>{MUSCLE_SHORT[m]}</option>
                        ))}
                      </select>

                      {/* Description */}
                      <input
                        value={row.description}
                        onChange={(e) => updateRow(row.uid, 'description', e.target.value)}
                        disabled={!isEditable || !row.selected}
                        style={{ ...inlineInputStyle, fontSize: '0.8125rem' }}
                      />

                      {/* Source */}
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.source}
                      </span>

                      {/* Status */}
                      <span style={{
                        fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: statusColor, textAlign: 'right'
                      }}>
                        {row.status === 'done' ? '✓'
                          : row.status === 'error' ? '✕'
                          : row.status === 'importing' ? '...'
                          : row.status === 'duplicate' ? 'DUPE'
                          : row.status === 'similar' ? 'PROCHE'
                          : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {!allImported && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { void importSelected() }}
                    disabled={importing || selectedCount === 0}
                    style={{ ...actionBtnStyle, opacity: importing || selectedCount === 0 ? 0.6 : 1 }}
                  >
                    {importing ? 'Import en cours...' : `Importer ${selectedCount} exercice${selectedCount !== 1 ? 's' : ''}`}
                  </button>
                  {errorCount > 0 && (
                    <button
                      onClick={() => { void retryErrors() }}
                      disabled={importing}
                      style={{ ...ghostBtnStyle, fontSize: '0.75rem' }}
                    >
                      Réessayer {errorCount} erreur{errorCount > 1 ? 's' : ''}
                    </button>
                  )}
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {dupeCount > 0 && 'Les doublons exacts sont décochés automatiquement.'}
                  </span>
                </div>
              )}

              {allImported && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ✓ Import terminé — {doneCount} exercice{doneCount !== 1 ? 's' : ''} ajouté{doneCount !== 1 ? 's' : ''} à la bibliothèque.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
