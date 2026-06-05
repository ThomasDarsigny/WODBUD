import { useRef, useState } from 'react'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { ExerciseCategory, MuscleGroup } from '../../types'

const GEMINI_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const VALID_CATEGORIES: ExerciseCategory[] = [
  'strength', 'olympic', 'gymnastics', 'cardio', 'mobility', 'accessory'
]
const VALID_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core',
  'glutes', 'quads', 'hamstrings', 'calves', 'cardio_upper', 'cardio_lower'
]

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Force', olympic: 'Haltéro', gymnastics: 'Gymn.', cardio: 'Cardio',
  mobility: 'Mobilité', accessory: 'Accessoire'
}
const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  chest: 'Pecto', back: 'Dos', shoulders: 'Épaules', biceps: 'Biceps',
  triceps: 'Triceps', forearms: 'Avant-bras', core: 'Core', glutes: 'Fessiers',
  quads: 'Quads', hamstrings: 'Ischios', calves: 'Mollets',
  cardio_upper: 'Cardio H.', cardio_lower: 'Cardio B.'
}

type OcrRow = {
  uid: string
  name: string
  category: ExerciseCategory
  primary_muscle: MuscleGroup
  description: string
  selected: boolean
  status: 'pending' | 'importing' | 'done' | 'error' | 'duplicate'
  error?: string
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

const OCR_PROMPT = `Analyse cette feuille d'entraînement CrossFit/fitness. Extrait TOUS les exercices mentionnés.

Réponds UNIQUEMENT avec un tableau JSON valide (pas de markdown, pas de texte autour).

Format exact :
[{"name":"Nom exercice","category":"strength","primary_muscle":"core","description":"Description courte en français"}]

Valeurs de category : strength (force/charges), olympic (haltérophilie/mouvements olympiques), gymnastics (gymnastic/corps), cardio (endurance/course), mobility (mobilité/étirements), accessory (accessoire).
Valeurs de primary_muscle : chest, back, shoulders, biceps, triceps, forearms, core, glutes, quads, hamstrings, calves, cardio_upper, cardio_lower.

Si aucun exercice trouvé, retourne [].`

async function callGemini(key: string, base64: string, mimeType: string): Promise<OcrRow[]> {
  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: OCR_PROMPT }] }],
      generationConfig: { temperature: 0.1 }
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `Erreur API Gemini (${res.status})`)
  }
  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  const raw = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>
  return raw
    .map((r, i) => ({
      uid: `${Date.now()}-${i}-${Math.random()}`,
      name: String(r.name ?? '').trim(),
      category: sanitizeCat(r.category),
      primary_muscle: sanitizeMuscle(r.primary_muscle),
      description: String(r.description ?? '').trim(),
      selected: true,
      status: 'pending' as const
    }))
    .filter((r) => r.name.length > 0)
}

interface Props {
  existingNames: Set<string>
}

export default function OcrImportSection({ existingNames }: Props) {
  const { createExercise } = useExerciseStore()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('')
  const [rows, setRows] = useState<OcrRow[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | File[]) {
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...imgs.filter((f) => !names.has(f.name))]
    })
    setError(null)
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  async function processImages() {
    if (!GEMINI_KEY) {
      setError('VITE_GEMINI_API_KEY manquant — ajoute la clé dans .env.local et relance le serveur.')
      return
    }
    if (files.length === 0) return

    setProcessing(true)
    setError(null)
    setRows([])

    const allRows: OcrRow[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProcessingMsg(`Image ${i + 1}/${files.length} — ${file.name}`)
      try {
        const base64 = await fileToBase64(file)
        const extracted = await callGemini(GEMINI_KEY, base64, file.type)
        for (const row of extracted) {
          const isDupe = existingNames.has(row.name.toLowerCase())
          allRows.push({ ...row, selected: !isDupe, status: isDupe ? 'duplicate' : 'pending' })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur OCR')
      }
    }

    setRows(allRows)
    setProcessing(false)
    setProcessingMsg('')
  }

  async function importSelected() {
    const toImport = rows.filter((r) => r.selected && r.status === 'pending')
    if (toImport.length === 0) return

    setImporting(true)

    for (const row of toImport) {
      setRows((prev) =>
        prev.map((r) => (r.uid === row.uid ? { ...r, status: 'importing' } : r))
      )
      try {
        await createExercise({
          name: row.name,
          description: row.description,
          category: row.category,
          primary_muscle: row.primary_muscle,
          secondary_muscles: [],
          video_url: null,
          video_path: null
        })
        setRows((prev) =>
          prev.map((r) => (r.uid === row.uid ? { ...r, status: 'done' } : r))
        )
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

  function toggleRow(uid: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.uid === uid && (r.status === 'pending' || r.status === 'duplicate')
          ? { ...r, selected: !r.selected, status: 'pending' }
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
  const allImported = rows.length > 0 && rows.every((r) => r.status === 'done' || r.status === 'duplicate' || r.status === 'error')

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
          fontFamily: 'var(--font-d)', fontSize: '0.6rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--black)', background: 'var(--orange)',
          padding: '0.2rem 0.5rem', flexShrink: 0
        }}>
          OCR
        </span>
        <span style={{
          fontFamily: 'var(--font-d)', fontSize: '0.82rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--white)'
        }}>
          Import rapide — Photos de feuilles d'entraînement
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-d)', fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          Gemini Flash · {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem' }}>
          {/* API key warning */}
          {!GEMINI_KEY && (
            <div style={{ marginBottom: '1rem', padding: '0.65rem 0.9rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b', fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              ⚠ Clé API manquante — ajoute <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.1rem 0.3rem' }}>VITE_GEMINI_API_KEY=ta_clé</code> dans <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.1rem 0.3rem' }}>.env.local</code> et relance le serveur.
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
                padding: '2rem', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s', marginBottom: '1rem'
              }}
            >
              <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                Dépose tes photos ici ou clique pour sélectionner
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem', opacity: 0.6 }}>
                JPG · PNG · WEBP — Feuilles d'entraînement des 6 dernières années
              </p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          {/* File list */}
          {files.length > 0 && rows.length === 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {files.map((f) => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--black)', border: '1px solid var(--border)', marginBottom: '0.3rem' }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.62rem', color: 'var(--muted)', marginLeft: '0.5rem', flexShrink: 0 }}>
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                  <button onClick={() => removeFile(f.name)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                style={{ ...ghostBtnStyle, fontSize: '0.65rem', marginTop: '0.3rem' }}
              >
                + Ajouter d'autres images
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
                {processing ? '...' : `Analyser ${files.length} image${files.length > 1 ? 's' : ''} avec Gemini`}
              </button>
              {processing && (
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {processingMsg}
                </span>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(255,77,0,0.08)', border: '1px solid rgba(255,77,0,0.3)', color: 'var(--orange)', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {/* Results table */}
          {rows.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {/* Summary chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', padding: '0.15rem 0.45rem' }}>
                  {rows.length} exercices extraits
                </span>
                {dupeCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', padding: '0.15rem 0.45rem' }}>
                    {dupeCount} déjà existants
                  </span>
                )}
                {doneCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', padding: '0.15rem 0.45rem' }}>
                    ✓ {doneCount} importés
                  </span>
                )}
                {errorCount > 0 && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)', border: '1px solid rgba(255,77,0,0.35)', padding: '0.15rem 0.45rem' }}>
                    ✕ {errorCount} erreurs
                  </span>
                )}
                <button
                  onClick={() => { setRows([]); setFiles([]) }}
                  style={{ ...ghostBtnStyle, fontSize: '0.62rem', marginLeft: 'auto' }}
                >
                  Réinitialiser
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,2fr) 90px 110px minmax(0,2fr) 52px', gap: '0', background: 'var(--black)', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.6rem' }}>
                {['', 'Nom', 'Catégorie', 'Muscle', 'Description', ''].map((h, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-d)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</span>
                ))}
              </div>

              <div style={{ border: '1px solid var(--border)', borderTop: 'none', maxHeight: 340, overflowY: 'auto' }}>
                {rows.map((row) => {
                  const isEditable = row.status === 'pending' || row.status === 'duplicate'
                  const statusColor =
                    row.status === 'done' ? '#22c55e'
                    : row.status === 'error' ? 'var(--orange)'
                    : row.status === 'importing' ? '#60a5fa'
                    : row.status === 'duplicate' ? '#f59e0b'
                    : 'var(--muted)'

                  return (
                    <div
                      key={row.uid}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px minmax(0,2fr) 90px 110px minmax(0,2fr) 52px',
                        gap: '0',
                        padding: '0.45rem 0.6rem',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        background: row.status === 'done' ? 'rgba(34,197,94,0.04)'
                          : row.status === 'error' ? 'rgba(255,77,0,0.04)'
                          : row.status === 'duplicate' ? 'rgba(245,158,11,0.04)'
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
                        style={{ ...inlineInputStyle, fontSize: '0.72rem' }}
                      />

                      {/* Status */}
                      <span style={{
                        fontFamily: 'var(--font-d)', fontSize: '0.58rem', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: statusColor, textAlign: 'right'
                      }}>
                        {row.status === 'done' ? '✓'
                          : row.status === 'error' ? '✕'
                          : row.status === 'importing' ? '...'
                          : row.status === 'duplicate' ? 'DUPE'
                          : ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {!allImported && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                  <button
                    onClick={importSelected}
                    disabled={importing || selectedCount === 0}
                    style={{ ...actionBtnStyle, opacity: importing || selectedCount === 0 ? 0.6 : 1 }}
                  >
                    {importing ? 'Import en cours...' : `Importer ${selectedCount} exercice${selectedCount !== 1 ? 's' : ''}`}
                  </button>
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {rows.filter((r) => r.status === 'duplicate').length > 0 && 'Les doublons sont décochés automatiquement.'}
                  </span>
                </div>
              )}

              {allImported && (
                <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.9rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontFamily: 'var(--font-d)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
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

const actionBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--black)',
  background: 'var(--orange)',
  border: 'none',
  padding: '0.6rem 1.1rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
} as const

const ghostBtnStyle = {
  fontFamily: 'var(--font-d)',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '0.45rem 0.75rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
} as const

const inlineInputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid transparent',
  color: 'var(--white)',
  fontFamily: 'var(--font-b)',
  fontSize: '0.8rem',
  padding: '0.15rem 0.25rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.1s'
} as const

const inlineSelectStyle = {
  background: 'var(--black)',
  border: '1px solid var(--border)',
  color: 'var(--white)',
  fontFamily: 'var(--font-d)',
  fontSize: '0.65rem',
  padding: '0.2rem 0.3rem',
  width: '100%',
  outline: 'none',
  cursor: 'pointer',
  letterSpacing: '0.05em'
} as const
