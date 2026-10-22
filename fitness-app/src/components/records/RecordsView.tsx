import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  addResults, deleteResult, estimate1RM, fetchExerciseNames, fetchMyResults, formatSeconds, fromKg,
  readUnit, summarize, writeUnit,
  type ExerciseRecord, type ExerciseResult, type ResultInput, type WeightUnit
} from '../../lib/records'
import EmptyState from '../ui/EmptyState'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import ProgressChart, { type ChartPoint } from './ProgressChart'
import ResultSheet from './ResultSheet'

type Metric = 'weight' | 'e1rm' | 'reps' | 'time'

/**
 * Mes records : le meilleur résultat par mouvement, et sa progression.
 * `?ex=<id>` ouvre le détail d'un mouvement, pour que « retour » marche.
 */
export default function RecordsView() {
  const { t, i18n } = useTranslation('common')
  const [params, setParams] = useSearchParams()
  const selected = params.get('ex')
  const [results, setResults] = useState<ExerciseResult[] | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [unit, setUnitState] = useState<WeightUnit>(readUnit)

  // Relire après un ajout ou une suppression : on incrémente la version.
  const [version, setVersion] = useState(0)
  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    let mounted = true
    fetchMyResults()
      .then(async (rows) => {
        const n = await fetchExerciseNames([...new Set(rows.map((r) => r.exerciseId))])
        if (!mounted) return
        setNames(n)
        setResults(rows)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : t('errors.generic'))
        setResults([])
      })
    return () => { mounted = false }
  }, [t, version])

  const records = useMemo(() => summarize(results ?? []), [results])
  const setUnit = (u: WeightUnit) => { setUnitState(u); writeUnit(u) }
  const closeSheet = useCallback(() => setSheet(false), [])

  const fmtDate = useCallback(
    (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
    [i18n.language]
  )
  const w = (kg: number) => `${fromKg(kg, unit)} ${unit}`

  const onAdd = async (input: ResultInput) => {
    await addResults([input])
    reload()
  }

  const record = selected ? records.find((r) => r.exerciseId === selected) : undefined

  return (
    <div className="wb-rec-page">
      <header className="wb-rec-head">
        <div>
          <p className="wb-rec-tag">{t('records.tag')}</p>
          <h1>{record ? (names.get(record.exerciseId) ?? '—') : t('records.title')}</h1>
        </div>
        <div className="wb-segmented wb-rec-units" role="group" aria-label={t('records.unit')}>
          {(['kg', 'lb'] as WeightUnit[]).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} className={unit === u ? 'is-on' : undefined} onClick={() => setUnit(u)}>{u}</button>
          ))}
        </div>
      </header>

      {selected && (
        <Link to="?" className="wb-rec-back" onClick={(e) => { e.preventDefault(); setParams({}) }}>
          ‹ {t('records.all')}
        </Link>
      )}

      <button type="button" className="wb-rec-add" onClick={() => setSheet(true)}>
        + {t('records.add')}
      </button>

      {error && <p className="wb-rec-error" role="alert">{error}</p>}

      {results === null ? (
        <div className="wb-rec-list"><Skeleton height={84} /><Skeleton height={84} /><Skeleton height={84} /></div>
      ) : selected ? (
        record ? (
          <RecordDetail
            record={record}
            results={results.filter((r) => r.exerciseId === record.exerciseId)}
            unit={unit}
            fmtDate={fmtDate}
            onDelete={async (id) => { await deleteResult(id); reload() }}
          />
        ) : (
          <EmptyState icon="star" title={t('records.none_for_exercise')} compact />
        )
      ) : records.length === 0 ? (
        <EmptyState icon="star" title={t('records.empty_title')} hint={t('records.empty_hint')} />
      ) : (
        <ul className="wb-rec-list wb-stagger">
          {records.map((r) => (
            <li key={r.exerciseId}>
              <button type="button" className="wb-rec-card" onClick={() => setParams({ ex: r.exerciseId })}>
                <span className="wb-rec-name">{names.get(r.exerciseId) ?? '—'}</span>
                <span className="wb-rec-best">{headline(r, w, t)}</span>
                <span className="wb-rec-meta">
                  {r.best1RM && r.bestWeight && (r.bestWeight.reps ?? 1) > 1 ? `${t('records.e1rm')} ${w(r.best1RM)} · ` : ''}
                  {t('records.count', { count: r.count })} · {fmtDate(r.lastAt)}
                </span>
                <span className="wb-rec-chev" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheet && (
        <ResultSheet
          withDate
          exercise={undefined}
          onSubmit={onAdd}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}

function headline(r: ExerciseRecord, w: (kg: number) => string, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (r.bestWeight?.weightKg) {
    const reps = r.bestWeight.reps ?? 1
    return reps > 1 ? `${w(r.bestWeight.weightKg)} × ${reps}` : w(r.bestWeight.weightKg)
  }
  if (r.bestTime?.seconds) return formatSeconds(r.bestTime.seconds)
  if (r.bestReps?.reps) return t('records.reps_value', { count: r.bestReps.reps })
  return '—'
}

function RecordDetail({ record, results, unit, fmtDate, onDelete }: {
  record: ExerciseRecord
  results: ExerciseResult[]
  unit: WeightUnit
  fmtDate: (iso: string) => string
  onDelete: (id: string) => Promise<void>
}) {
  const { t } = useTranslation('common')
  const w = (kg: number) => `${fromKg(kg, unit)} ${unit}`

  const available = useMemo(() => {
    const m: Metric[] = []
    if (results.some((r) => r.weightKg !== null)) m.push('weight')
    if (results.some((r) => r.weightKg !== null && (r.reps ?? 1) > 1 && estimate1RM(r.weightKg, r.reps) !== null)) m.push('e1rm')
    if (results.some((r) => r.seconds !== null && r.weightKg === null)) m.push('time')
    if (results.some((r) => r.reps !== null && r.weightKg === null && r.seconds === null)) m.push('reps')
    return m
  }, [results])
  const [chosen, setMetric] = useState<Metric | null>(null)
  const metric = chosen && available.includes(chosen) ? chosen : available[0]

  const points: ChartPoint[] = useMemo(() => results.flatMap((r): ChartPoint[] => {
    const w = (kg: number) => `${fromKg(kg, unit)} ${unit}`
    if (metric === 'weight' && r.weightKg !== null) return [{ at: r.performedAt, value: r.weightKg, label: (r.reps ?? 1) > 1 ? `${w(r.weightKg)} × ${r.reps}` : w(r.weightKg) }]
    if (metric === 'e1rm' && r.weightKg !== null) {
      const e = estimate1RM(r.weightKg, r.reps)
      return e === null ? [] : [{ at: r.performedAt, value: e, label: w(e) }]
    }
    if (metric === 'time' && r.seconds !== null && r.weightKg === null) return [{ at: r.performedAt, value: r.seconds, label: formatSeconds(r.seconds) }]
    if (metric === 'reps' && r.reps !== null && r.weightKg === null && r.seconds === null) return [{ at: r.performedAt, value: r.reps, label: t('records.reps_value', { count: r.reps }) }]
    return []
  }), [results, metric, unit, t])

  const hero = metric === 'weight' && record.bestWeight?.weightKg
    ? w(record.bestWeight.weightKg)
    : metric === 'e1rm' && record.best1RM
      ? w(record.best1RM)
      : metric === 'time' && record.bestTime?.seconds
        ? formatSeconds(record.bestTime.seconds)
        : metric === 'reps' && record.bestReps?.reps
          ? t('records.reps_value', { count: record.bestReps.reps })
          : '—'

  return (
    <section className="wb-rec-detail">
      <div className="wb-rec-hero">
        <span>{t(`records.metric_${metric}`)}</span>
        <strong>{hero}</strong>
      </div>

      {available.length > 1 && (
        <div className="wb-segmented wb-rec-metrics" role="tablist" aria-label={t('records.kind')}>
          {available.map((m) => (
            <button key={m} type="button" role="tab" aria-selected={metric === m} className={metric === m ? 'is-on' : undefined} onClick={() => setMetric(m)}>
              {t(`records.metric_${m}`)}
            </button>
          ))}
        </div>
      )}

      {points.length > 1 ? (
        <ProgressChart
          points={points}
          lowerIsBetter={metric === 'time'}
          ariaLabel={t('records.chart_label', { metric: t(`records.metric_${metric}`) })}
          dateFormat={fmtDate}
        />
      ) : (
        <p className="wb-rec-hint">{t('records.chart_need_two')}</p>
      )}

      <h2 className="wb-rec-sub">{t('records.history')}</h2>
      <ul className="wb-rec-history wb-stagger">
        {results.map((r) => (
          <li key={r.id}>
            <span className="wb-rec-hval">
              {r.weightKg !== null
                ? ((r.reps ?? 1) > 1 ? `${w(r.weightKg)} × ${r.reps}` : w(r.weightKg))
                : r.seconds !== null
                  ? formatSeconds(r.seconds)
                  : t('records.reps_value', { count: r.reps ?? 0 })}
            </span>
            <span className="wb-rec-hdate">
              {fmtDate(r.performedAt)}
              {r.notes ? ` · ${r.notes}` : ''}
            </span>
            <ConfirmButton
              onConfirm={() => onDelete(r.id)}
              confirmLabel={t('actions.confirm')}
              title={t('actions.delete')}
              style={{ minHeight: 36, padding: '0 0.7rem', fontSize: '0.75rem' }}
            >
              ✕
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </section>
  )
}
