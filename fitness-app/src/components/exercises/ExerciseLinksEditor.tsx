import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseStore } from '../../stores/exerciseStore'
import { addLink, fetchVariants, removeLink, ZONES, type Variant, type VariantKind, type Zone } from '../../lib/exerciseLinks'
import type { Exercise } from '../../types'

const KINDS: VariantKind[] = ['harder', 'easier', 'adaptation']

/**
 * Liens d'un exercice (052) : WODBUD relie la base commune (scope null), un
 * proprio ou un chef relie pour son centre (scope = son centre). On ne retire
 * que les liens de sa propre portée ; ceux de WODBUD restent visibles.
 */
export default function ExerciseLinksEditor({ exercise, scope }: { exercise: Exercise; scope: string | null }) {
  const { t } = useTranslation(['exercises', 'common'])
  const { exercises } = useExerciseStore()
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<VariantKind>('harder')
  const [zone, setZone] = useState<Zone>('knee')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchVariants(exercise.id).then((v) => { if (alive) setVariants(v) }).catch(() => { if (alive) setVariants([]) })
    return () => { alive = false }
  }, [exercise.id])

  // Exercices reliables : base commune, plus ceux du centre pour un lien de centre.
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const taken = new Set((variants ?? []).filter((v) => v.kind === kind && (kind !== 'adaptation' || v.zone === zone)).map((v) => v.exerciseId))
    return exercises
      .filter((e) => e.id !== exercise.id && !taken.has(e.id))
      .filter((e) => !e.center_id || (scope !== null && e.center_id === scope))
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [exercises, exercise.id, search, scope, variants, kind, zone])

  async function add(other: Exercise) {
    setBusy(true)
    setError(null)
    try {
      await addLink({ exerciseId: exercise.id, otherId: other.id, kind, zone: kind === 'adaptation' ? zone : undefined, centerId: scope })
      setVariants(await fetchVariants(exercise.id))
      setSearch('')
      setAdding(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('duplicate') || msg.includes('unique') ? t('links.exists') : t('errors.generic', { ns: 'common' }))
    } finally {
      setBusy(false)
    }
  }

  async function remove(v: Variant) {
    setBusy(true)
    setError(null)
    try {
      await removeLink(v.linkId)
      setVariants((list) => (list ?? []).filter((x) => x.linkId !== v.linkId))
    } catch {
      setError(t('errors.generic', { ns: 'common' }))
    } finally {
      setBusy(false)
    }
  }

  if (variants === null) return null

  return (
    <section className="wb-links" aria-label={t('links.title')}>
      <div className="wb-links-head">
        <p className="wb-links-title">{t('links.title')}</p>
        {!adding && (
          <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" onClick={() => setAdding(true)}>
            {t('links.add')}
          </button>
        )}
      </div>

      {variants.length === 0 && !adding && <p className="wb-set-hint">{t('links.empty')}</p>}

      {variants.length > 0 && (
        <ul className="wb-links-list">
          {variants.map((v) => (
            <li key={`${v.linkId}-${v.kind}`}>
              <span className={`wb-pill wb-links-kind wb-links-kind--${v.kind}`}>
                {v.kind === 'adaptation' && v.zone ? t('links.adapt_zone', { zone: t(`links.zones.${v.zone}`) }) : t(`links.kinds.${v.kind}`)}
              </span>
              <span className="wb-links-name">{v.name}</span>
              {v.centerId === null && scope !== null && <span className="wb-pill">WODBUD</span>}
              {v.centerId === scope && (
                <button type="button" className="wb-links-remove" disabled={busy} onClick={() => { void remove(v) }} aria-label={t('links.remove', { name: v.name })}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="wb-links-form">
          <div className="wb-links-chips" role="group" aria-label={t('links.kind')}>
            {KINDS.map((k) => (
              <button key={k} type="button" className="wb-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
                {t(`links.kinds.${k}`)}
              </button>
            ))}
          </div>
          {kind === 'adaptation' && (
            <div className="wb-links-chips" role="group" aria-label={t('links.zone')}>
              {ZONES.map((z) => (
                <button key={z} type="button" className="wb-chip" aria-pressed={zone === z} onClick={() => setZone(z)}>
                  {t(`links.zones.${z}`)}
                </button>
              ))}
            </div>
          )}
          <p className="wb-set-hint">{t(`links.explain_${kind}`, { name: exercise.name })}</p>
          <div className="wb-search">
            <input
              className="wb-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('links.search')}
              aria-label={t('links.search')}
              autoFocus
            />
          </div>
          {candidates.length > 0 && (
            <ul className="wb-links-candidates">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={busy} onClick={() => { void add(c) }}>
                    <span>{c.name}</span>
                    {c.center_id && <span className="wb-pill wb-pill--orange">{t('center_badge.center')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.trim() && candidates.length === 0 && <p className="wb-set-hint">{t('links.no_match')}</p>}
          <div>
            <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={() => { setAdding(false); setSearch(''); setError(null) }}>
              {t('actions.cancel', { ns: 'common' })}
            </button>
          </div>
        </div>
      )}

      {error && <p className="wb-rec-error" role="alert">{error}</p>}
    </section>
  )
}
