import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { readUnit } from '../../lib/records'
import { formatScore, loadToKg, parseTime, saveScore, scoreTypeFor, SCORE_TYPES, type Rx, type Score, type ScoreType } from '../../lib/scores'
import type { WorkoutMethod } from '../../types'

/**
 * Score du WOD en fin de séance (1.2) : le type vient de la méthode du WOD,
 * les champs changent avec lui, RX ou adapté, enregistrer. Trois touchers
 * pour un temps : le champ, le chiffre, le bouton.
 */
export default function ScoreEntry({ sessionId, workoutId }: { sessionId: string; workoutId: string }) {
  const { t } = useTranslation(['workouts', 'common'])
  const unit = readUnit()
  const [method, setMethod] = useState<WorkoutMethod | null>(null)
  const [type, setType] = useState<ScoreType>('time')
  const [time, setTime] = useState('')
  const [rounds, setRounds] = useState('')
  const [reps, setReps] = useState('')
  const [load, setLoad] = useState('')
  const [capped, setCapped] = useState(false)
  const [rx, setRx] = useState<Rx>('rx')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Score | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase.from('workouts').select('method').eq('id', workoutId).maybeSingle().then(({ data }) => {
      if (!alive) return
      const m = (data?.method as WorkoutMethod | undefined) ?? 'custom'
      setMethod(m)
      const natural = scoreTypeFor(m)
      if (natural) setType(natural)
    })
    return () => { alive = false }
  }, [workoutId])

  const n = (v: string) => (v.trim() === '' ? null : Number(v))

  function build(): Score | string {
    const base = { sessionId, workoutId, rx }
    if (type === 'time') {
      const seconds = parseTime(time)
      if (seconds === null) return t('score.bad_time')
      const r = capped ? n(reps) : undefined
      if (capped && (r === null || r === undefined || r < 0)) return t('score.bad_reps')
      return { ...base, scoreType: 'time', seconds, capped, reps: capped ? r ?? 0 : undefined }
    }
    if (type === 'rounds_reps') {
      const ro = n(rounds), re = n(reps) ?? 0
      if (ro === null || ro < 0 || re < 0) return t('score.bad_rounds')
      return { ...base, scoreType: 'rounds_reps', rounds: ro, reps: re }
    }
    if (type === 'reps') {
      const re = n(reps)
      if (re === null || re < 0) return t('score.bad_reps')
      return { ...base, scoreType: 'reps', reps: re }
    }
    const lo = n(load)
    if (lo === null || lo <= 0) return t('score.bad_load')
    const re = n(reps)
    return { ...base, scoreType: 'load', loadKg: loadToKg(lo, unit), reps: re === null ? undefined : re }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const score = build()
    if (typeof score === 'string') { setError(score); return }
    setSaving(true)
    setError(null)
    try {
      setSaved(await saveScore(score))
    } catch {
      setError(t('errors.generic', { ns: 'common' }))
    } finally {
      setSaving(false)
    }
  }

  if (method === null) return null

  if (saved) {
    return (
      <div className="wb-score wb-score--done" role="status">
        <p className="wb-score-title">{t('score.saved_title')}</p>
        <p className="wb-score-big">{formatScore(saved, unit)} <span className={`wb-pill ${saved.rx === 'rx' ? 'wb-pill--orange' : ''}`}>{t(`score.rx_${saved.rx}`)}</span></p>
        <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={() => setSaved(null)}>{t('score.change')}</button>
      </div>
    )
  }

  return (
    <form className="wb-score" onSubmit={(e) => { void submit(e) }}>
      <p className="wb-score-title">{t('score.title')}</p>

      {scoreTypeFor(method) === null && (
        <div className="wb-links-chips" role="group" aria-label={t('score.type')}>
          {SCORE_TYPES.map((st) => (
            <button key={st} type="button" className="wb-chip" aria-pressed={type === st} onClick={() => setType(st)}>{t(`score.types.${st}`)}</button>
          ))}
        </div>
      )}

      <div className="wb-score-fields">
        {type === 'time' && (
          <label className="wb-score-field">
            <span>{t('score.time_label')}</span>
            <input id="score-time" className="wb-input wb-score-input" inputMode="numeric" placeholder="12:34" value={time} onChange={(e) => setTime(e.target.value)} autoFocus />
          </label>
        )}
        {type === 'rounds_reps' && (
          <>
            <label className="wb-score-field"><span>{t('score.rounds_label')}</span><input id="score-rounds" className="wb-input wb-score-input" type="number" inputMode="numeric" min={0} value={rounds} onChange={(e) => setRounds(e.target.value)} autoFocus /></label>
            <label className="wb-score-field"><span>{t('score.reps_extra_label')}</span><input id="score-reps" className="wb-input wb-score-input" type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} /></label>
          </>
        )}
        {type === 'reps' && (
          <label className="wb-score-field"><span>{t('score.reps_label')}</span><input id="score-reps" className="wb-input wb-score-input" type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} autoFocus /></label>
        )}
        {type === 'load' && (
          <>
            <label className="wb-score-field"><span>{t('score.load_label', { unit })}</span><input id="score-load" className="wb-input wb-score-input" type="number" inputMode="decimal" min={0} step="0.5" value={load} onChange={(e) => setLoad(e.target.value)} autoFocus /></label>
            <label className="wb-score-field"><span>{t('score.reps_opt_label')}</span><input id="score-reps" className="wb-input wb-score-input" type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} /></label>
          </>
        )}
      </div>

      {type === 'time' && (
        <label className="wb-suggest-anon">
          <input type="checkbox" checked={capped} onChange={(e) => setCapped(e.target.checked)} />
          <span>{t('score.capped')}</span>
        </label>
      )}
      {type === 'time' && capped && (
        <label className="wb-score-field"><span>{t('score.reps_done_label')}</span><input id="score-capped-reps" className="wb-input wb-score-input" type="number" inputMode="numeric" min={0} value={reps} onChange={(e) => setReps(e.target.value)} /></label>
      )}

      <div className="wb-links-chips" role="group" aria-label={t('score.rx')}>
        {(['rx', 'scaled'] as Rx[]).map((v) => (
          <button key={v} type="button" className="wb-chip" aria-pressed={rx === v} onClick={() => setRx(v)}>{t(`score.rx_${v}`)}</button>
        ))}
      </div>
      <p className="wb-set-hint" style={{ margin: 0 }}>{t(`score.rx_hint_${rx}`)}</p>

      {error && <p className="wb-rec-error" role="alert">{error}</p>}
      <button type="submit" className="wb-btn wb-btn--primary" disabled={saving}>{saving ? t('status.loading', { ns: 'common' }) : t('score.save')}</button>
    </form>
  )
}
