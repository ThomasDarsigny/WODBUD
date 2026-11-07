import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { Exercise } from '../../types'
import { CATEGORY_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import {
  aggregate, analyzeImage, CATEGORIES, csvToRows, MUSCLES, saveMentions,
  type ExtractedRow, type ImportRow, type ImportSource
} from '../../lib/exerciseImport'

type Pending = { key: string; label: string; file: File; source: ImportSource }

const isCsv = (f: File) => f.type === 'text/csv' || /\.csv$/i.test(f.name)
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

/**
 * Importer des exercices (050) : CSV, PDF ou photos de feuilles. Les noms qui
 * reviennent sont fusionnés et comptés ; ceux qui existent déjà sont reliés à
 * l'exercice existant au lieu d'être recréés. Les mentions alimentent la
 * liste des vidéos à tourner en priorité chez WODBUD.
 *
 * `centerId` : import d'un centre (exercices créés dans le centre, en
 * relecture). `null` : import de WODBUD dans la base commune.
 */
export default function ExerciseImport({ existing, centerId }: { existing: Exercise[]; centerId: string | null }) {
  const { t } = useTranslation(['exercises', 'common'])
  const { createExercise } = useExerciseStore()
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [failures, setFailures] = useState<{ item: Pending; message: string }[]>([])
  const [mentionsSaved, setMentionsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    const ok = Array.from(list).filter((f) => f.type.startsWith('image/') || isPdf(f) || isCsv(f))
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...ok.filter((f) => !names.has(f.name))]
    })
    setError(null)
  }

  /** Une photo = une image ; un PDF = une image par page ; un CSV est lu sur place. */
  async function extract(source: File[]): Promise<{ found: ExtractedRow[]; failed: { item: Pending; message: string }[] }> {
    const found: ExtractedRow[] = []
    const failed: { item: Pending; message: string }[] = []
    const queue: Pending[] = []
    for (const file of source) {
      if (isCsv(file)) {
        found.push(...csvToRows(await file.text(), file.name))
      } else if (isPdf(file)) {
        try {
          const { pdfToImages } = await import('../../lib/pdfToImages')
          const pages = await pdfToImages(file)
          pages.forEach((p, i) => queue.push({ key: `${file.name}-${i}`, label: p.label, file: p.file, source: 'pdf' }))
        } catch (err) {
          failed.push({ item: { key: file.name, label: file.name, file, source: 'pdf' }, message: err instanceof Error ? err.message : 'PDF' })
        }
      } else {
        queue.push({ key: file.name, label: file.name, file, source: 'photo' })
      }
    }
    const more = await analyzeQueue(queue)
    return { found: [...found, ...more.found], failed: [...failed, ...more.failed] }
  }

  async function analyzeQueue(queue: Pending[]) {
    const found: ExtractedRow[] = []
    const failed: { item: Pending; message: string }[] = []
    for (const [i, item] of queue.entries()) {
      setProgress(t('import.reading', { n: i + 1, total: queue.length, name: item.label }))
      try {
        found.push(...(await analyzeImage(item.file, item.label, item.source, centerId ?? undefined)))
      } catch (err) {
        failed.push({ item, message: err instanceof Error ? err.message : 'OCR' })
      }
    }
    return { found, failed }
  }

  async function analyze() {
    setBusy(true)
    setError(null)
    setMentionsSaved(false)
    try {
      const { found, failed } = await extract(files)
      setRows(aggregate(found, existing))
      setFailures(failed)
      if (!found.length && !failed.length) setError(t('import.nothing_found'))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  async function retryFailed() {
    setBusy(true)
    try {
      const { found, failed } = await analyzeQueue(failures.map((f) => f.item))
      // On refusionne tout : un exercice relu peut déjà être dans la liste.
      const previous: ExtractedRow[] = rows.flatMap((r) => [{
        name: r.name, category: r.category, primary_muscle: r.primary_muscle, description: r.description,
        occurrences: r.occurrences, source: r.sources[0], label: r.labels[0]
      }])
      setRows(aggregate([...previous, ...found], existing))
      setFailures(failed)
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const patch = (uid: string, p: Partial<ImportRow>) => setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...p } : r)))

  async function runImport() {
    setBusy(true)
    setError(null)
    const done: ImportRow[] = rows.map((r) => ({ ...r }))
    for (const r of done) {
      if (!r.selected || r.status === 'done') continue
      patch(r.uid, { status: 'importing' })
      try {
        const created = await createExercise({
          name: r.name.trim(),
          description: r.description,
          category: r.category,
          body_region: 'full',
          movement_type: null,
          secondary_movements: [],
          methods: [],
          primary_muscle: r.primary_muscle,
          secondary_muscles: [],
          tertiary_muscles: [],
          video_url: null,
          video_path: null,
          ...(centerId ? { center_id: centerId } : {})
        })
        r.status = 'done'
        r.createdId = created.id
        patch(r.uid, { status: 'done', createdId: created.id, error: undefined })
      } catch (err) {
        r.status = 'error'
        patch(r.uid, { status: 'error', error: err instanceof Error ? err.message : 'Erreur' })
      }
    }
    // Les mentions une seule fois par analyse, même si on réessaie des erreurs.
    if (!mentionsSaved) {
      try {
        await saveMentions(done, centerId)
        setMentionsSaved(true)
      } catch (err) {
        setError(t('import.mentions_failed', { reason: err instanceof Error ? err.message : '' }))
      }
    }
    setBusy(false)
  }

  function reset() {
    setFiles([])
    setRows([])
    setFailures([])
    setMentionsSaved(false)
    setError(null)
  }

  const toCreate = rows.filter((r) => r.selected && r.status !== 'done').length
  const linked = rows.filter((r) => !r.selected && r.match.kind !== 'none').length
  const mentions = rows.reduce((n, r) => n + r.occurrences, 0)
  const created = rows.filter((r) => r.status === 'done').length
  const errors = rows.filter((r) => r.status === 'error').length
  const finished = mentionsSaved && toCreate === 0

  return (
    <section className="wb-card wb-imp">
      <button type="button" className="wb-imp-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="wb-imp-tag">{t('import.tag')}</span>
        <span className="wb-imp-title">
          <strong>{t('import.title')}</strong>
          <small>{centerId ? t('import.sub_center') : t('import.sub_admin')}</small>
        </span>
        <span className="wb-row-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="wb-imp-body">
          {rows.length === 0 && (
            <>
              <div className="wb-imp-actions">
                <button type="button" className="wb-btn wb-btn--primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
                  {t('import.take_photo')}
                </button>
                <button type="button" className="wb-btn wb-btn--secondary" onClick={() => pickRef.current?.click()} disabled={busy}>
                  {t('import.pick_files')}
                </button>
              </div>
              <p className="wb-exf-hint">{t('import.formats')}</p>
              {/* Caméra à part : `capture` avec `multiple` ou un accept large
                  retombe sur la galerie dans la plupart des navigateurs mobiles. */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
              <input ref={pickRef} type="file" accept="image/*,.pdf,application/pdf,.csv,text/csv" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />

              {files.length > 0 && (
                <>
                  <ul className="wb-exf-refs">
                    {files.map((f) => (
                      <li key={f.name}>
                        <span>{f.name}</span>
                        <small>{isCsv(f) ? 'CSV' : isPdf(f) ? 'PDF' : 'Photo'}</small>
                        <button type="button" aria-label={t('actions.delete', { ns: 'common' })} onClick={() => setFiles((l) => l.filter((x) => x !== f))} disabled={busy}>✕</button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="wb-btn wb-btn--primary wb-btn--block" onClick={() => { void analyze() }} disabled={busy}>
                    {busy ? t('status.loading', { ns: 'common' }) : t('import.analyze', { count: files.length })}
                  </button>
                </>
              )}
            </>
          )}

          {progress && <p className="wb-exf-progress" role="status">{progress}</p>}
          {error && <p className="wb-rec-error" role="alert">{error}</p>}

          {failures.length > 0 && (
            <div className="wb-imp-fail">
              <p>{t('import.failed', { count: failures.length })}</p>
              {failures.map((f) => <small key={f.item.key}>{f.item.label} — {f.message}</small>)}
              <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => { void retryFailed() }} disabled={busy}>
                {t('import.retry')}
              </button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="wb-imp-summary">
                <span className="wb-chip">{t('import.found', { count: rows.length })}</span>
                <span className="wb-chip">{t('import.mentions', { count: mentions })}</span>
                {linked > 0 && <span className="wb-chip">{t('import.linked', { count: linked })}</span>}
                {created > 0 && <span className="wb-chip">{t('import.created', { count: created })}</span>}
                {errors > 0 && <span className="wb-chip is-err">{t('import.errors', { count: errors })}</span>}
              </div>
              <p className="wb-exf-hint">{t('import.explain')}</p>

              <ul className="wb-imp-rows">
                {rows.map((r) => {
                  const locked = busy || r.status === 'done' || r.status === 'importing'
                  return (
                    <li key={r.uid} className={`wb-imp-row is-${r.status}${r.selected ? '' : ' is-linked'}`} title={r.error}>
                      <div className="wb-imp-line">
                        <input
                          className="wb-input wb-imp-name"
                          value={r.name}
                          onChange={(e) => patch(r.uid, { name: e.target.value })}
                          disabled={locked || !r.selected}
                          aria-label={t('fields.name')}
                        />
                        <span className="wb-imp-count" title={r.labels.join(', ')}>×{r.occurrences}</span>
                      </div>

                      {r.match.kind !== 'none' && (
                        <label className="wb-imp-match">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            disabled={locked}
                            onChange={() => patch(r.uid, { selected: !r.selected })}
                          />
                          <span>
                            {r.selected
                              ? t('import.create_anyway')
                              : t(r.match.kind === 'exact' ? 'import.linked_exact' : 'import.linked_similar', { name: r.match.exercise.name })}
                          </span>
                        </label>
                      )}

                      {r.selected && (
                        <div className="wb-imp-fields">
                          <select className="wb-input" value={r.category} disabled={locked} onChange={(e) => patch(r.uid, { category: e.target.value as ImportRow['category'] })} aria-label={t('fields.category')}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{t(CATEGORY_I18N_KEYS[c], { ns: 'common' })}</option>)}
                          </select>
                          <select className="wb-input" value={r.primary_muscle} disabled={locked} onChange={(e) => patch(r.uid, { primary_muscle: e.target.value as ImportRow['primary_muscle'] })} aria-label={t('fields.primary_muscle')}>
                            {MUSCLES.map((m) => <option key={m} value={m}>{t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}</option>)}
                          </select>
                        </div>
                      )}

                      {r.status !== 'pending' && (
                        <span className="wb-imp-status">
                          {r.status === 'done' ? t('import.status_done') : r.status === 'importing' ? t('status.loading', { ns: 'common' }) : r.error}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              {finished ? (
                <div className="wb-imp-done">
                  <p>{t('import.done', { created, linked, mentions })}</p>
                  <button type="button" className="wb-btn wb-btn--secondary" onClick={reset}>{t('import.again')}</button>
                </div>
              ) : (
                <div className="wb-imp-actions">
                  <button type="button" className="wb-btn wb-btn--primary" onClick={() => { void runImport() }} disabled={busy}>
                    {busy ? t('status.loading', { ns: 'common' }) : toCreate ? t('import.import', { count: toCreate }) : t('import.link_only')}
                  </button>
                  <button type="button" className="wb-btn wb-btn--ghost" onClick={reset} disabled={busy}>{t('actions.reset', { ns: 'common' })}</button>
                </div>
              )}
              {centerId && <p className="wb-exf-hint">{t('import.center_review')}</p>}
            </>
          )}
        </div>
      )}
    </section>
  )
}
