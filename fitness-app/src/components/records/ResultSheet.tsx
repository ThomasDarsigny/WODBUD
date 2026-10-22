import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { field } from '../../styles/ui'
import { localDate } from '../../lib/scheduledWorkouts'
import {
  fetchExerciseOptions, parseDuration, readUnit, toKg, writeUnit,
  type ExerciseOption, type ResultInput, type WeightUnit
} from '../../lib/records'

type Kind = 'load' | 'reps' | 'time'

interface Props {
  /** Mouvement imposé (depuis une séance). Sinon, on le choisit dans la liste. */
  exercise?: ExerciseOption
  /** Une séance note « maintenant » ; un résultat à part peut être daté. */
  withDate?: boolean
  onSubmit: (input: ResultInput) => Promise<void> | void
  onClose: () => void
}

/** Feuille « Noter un résultat » : une charge, des répétitions ou un temps. */
export default function ResultSheet({ exercise, withDate = false, onSubmit, onClose }: Props) {
  const { t } = useTranslation('common')
  const [options, setOptions] = useState<ExerciseOption[]>([])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<ExerciseOption | null>(exercise ?? null)
  const [kind, setKind] = useState<Kind>(exercise?.timeBased ? 'time' : 'load')
  const [unit, setUnit] = useState<WeightUnit>(readUnit)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [time, setTime] = useState('')
  const [date, setDate] = useState(() => localDate(new Date()))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (exercise) return
    let mounted = true
    fetchExerciseOptions().then((o) => { if (mounted) setOptions(o) }).catch(() => {})
    return () => { mounted = false }
  }, [exercise])

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, picked])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options).slice(0, 40)
  }, [options, query])

  const pick = (o: ExerciseOption) => {
    setPicked(o)
    setKind(o.timeBased ? 'time' : 'load')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!picked) return
    const input: ResultInput = { exerciseId: picked.id, notes: notes || null }
    const w = Number(weight.replace(',', '.'))
    const r = reps.trim() ? Number(reps) : null
    if (kind === 'load') {
      if (!(w > 0)) { setError(t('records.err_weight')); return }
      if (r !== null && !(Number.isInteger(r) && r >= 1)) { setError(t('records.err_reps')); return }
      input.weightKg = toKg(w, unit)
      input.reps = r
    } else if (kind === 'reps') {
      if (!(r !== null && Number.isInteger(r) && r >= 1)) { setError(t('records.err_reps')); return }
      input.reps = r
    } else {
      const s = parseDuration(time)
      if (s === null) { setError(t('records.err_time')); return }
      input.seconds = s
    }
    if (withDate && date !== localDate(new Date())) {
      // Midi local : la date reste la même quel que soit le fuseau.
      input.performedAt = new Date(`${date}T12:00:00`).toISOString()
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(input)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setSaving(false)
    }
  }

  const changeUnit = (u: WeightUnit) => { setUnit(u); writeUnit(u) }

  return (
    <div className="wb-sheet-backdrop is-centered" onClick={onClose}>
      <div className="wb-sheet" role="dialog" aria-modal="true" aria-labelledby="wb-result-title" onClick={(e) => e.stopPropagation()}>
        <div className="wb-sheet-grabber" aria-hidden="true" />
        <div className="wb-sheet-head">
          <h2 id="wb-result-title">{picked ? picked.name : t('records.pick_title')}</h2>
          <button type="button" className="wb-sheet-close" onClick={onClose} aria-label={t('actions.close')}>✕</button>
        </div>

        {!picked ? (
          <>
            <input
              ref={firstRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('records.search')}
              aria-label={t('records.search')}
              style={field}
            />
            <ul className="wb-rec-pick">
              {matches.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => pick(o)}>{o.name}</button>
                </li>
              ))}
              {options.length > 0 && matches.length === 0 && <li className="wb-rec-empty">{t('records.no_match')}</li>}
            </ul>
          </>
        ) : (
          <form onSubmit={submit} className="wb-rec-form">
            {!exercise && (
              <button type="button" className="wb-rec-change" onClick={() => setPicked(null)}>
                ‹ {t('records.change_exercise')}
              </button>
            )}

            <div className="wb-segmented" role="tablist" aria-label={t('records.kind')}>
              {(['load', 'reps', 'time'] as Kind[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? 'is-on' : undefined} onClick={() => { setKind(k); setError(null) }}>
                  {t(`records.kind_${k}`)}
                </button>
              ))}
            </div>

            {kind === 'load' && (
              <div className="wb-rec-row">
                <label>
                  <span>{t('records.weight')}</span>
                  <span className="wb-rec-unit">
                    <input ref={firstRef} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" style={field} />
                    <span role="group" aria-label={t('records.unit')}>
                      {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                        <button key={u} type="button" aria-pressed={unit === u} className={unit === u ? 'is-on' : undefined} onClick={() => changeUnit(u)}>{u}</button>
                      ))}
                    </span>
                  </span>
                </label>
                <label>
                  <span>{t('records.reps_optional')}</span>
                  <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="1" style={field} />
                </label>
              </div>
            )}
            {kind === 'reps' && (
              <label className="wb-rec-field">
                <span>{t('records.reps')}</span>
                <input ref={firstRef} inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="0" style={field} />
              </label>
            )}
            {kind === 'time' && (
              <label className="wb-rec-field">
                <span>{t('records.time')}</span>
                <input ref={firstRef} inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} placeholder="3:20" style={field} />
                <small>{t('records.time_hint')}</small>
              </label>
            )}

            {withDate && (
              <label className="wb-rec-field">
                <span>{t('records.date')}</span>
                <input type="date" value={date} max={localDate(new Date())} onChange={(e) => setDate(e.target.value)} style={field} />
              </label>
            )}

            <label className="wb-rec-field">
              <span>{t('records.notes')}</span>
              <input value={notes} maxLength={280} onChange={(e) => setNotes(e.target.value)} placeholder={t('records.notes_placeholder')} style={field} />
            </label>

            {error && <p className="wb-rec-error" role="alert">{error}</p>}

            <button type="submit" className="wb-rec-submit" disabled={saving}>
              {saving ? t('records.saving') : t('records.save')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
