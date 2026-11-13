import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { challengeState, createChallenge, deleteChallenge, fetchChallenges, type CommunityChallenge } from '../../lib/communitySocial'
import { localDate } from '../../lib/scheduledWorkouts'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { Notice, SectionLabel } from './communityUi'

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localDate(d)
}

/** Objectif collectif en minutes ; seuls ceux qui partagent leur rang comptent. */
export default function CommunityChallenges({ communityId, isAdmin }: { communityId: string; isAdmin: boolean }) {
  const { t, i18n } = useTranslation('common')
  const [list, setList] = useState<CommunityChallenge[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = localDate()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('1000')
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(addDays(today, 30))
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    try { setList(await fetchChallenges(communityId)) } catch (err) { setError(err instanceof Error ? err.message : t('errors.generic')) }
  }, [communityId, t])

  useEffect(() => {
    let mounted = true
    fetchChallenges(communityId)
      .then((rows) => { if (mounted) setList(rows) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [communityId, t])

  const targetNum = Number(target)
  const valid = title.trim().length > 0 && Number.isInteger(targetNum) && targetNum > 0 && endsOn >= startsOn

  async function submit() {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await createChallenge({ communityId, title, targetMinutes: targetNum, startsOn, endsOn })
      setTitle('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })

  return (
    <div>
      <Notice>{t('community.challenge_hint')}</Notice>
      {error && <Notice tone='error'>{error}</Notice>}

      {isAdmin && (
        <div className="wb-commu-box wb-commu-form">
          <SectionLabel>{t('community.challenge_new')}</SectionLabel>
          <input className="wb-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t('community.challenge_title_placeholder')} aria-label={t('community.challenge_title_placeholder')} />
          <div className="wb-commu-form-grid">
            <label className="wb-commu-field">
              {t('community.challenge_target')}
              <input className="wb-input" type='number' min={1} inputMode='numeric' value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="wb-commu-field">
              {t('community.challenge_start')}
              <input className="wb-input" type='date' value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </label>
            <label className="wb-commu-field">
              {t('community.challenge_end')}
              <input className="wb-input" type='date' value={endsOn} min={startsOn} max={addDays(startsOn, 92)} onChange={(e) => setEndsOn(e.target.value)} />
            </label>
          </div>
          <button type="button" onClick={() => { void submit() }} disabled={!valid || saving} className="wb-btn wb-btn--primary wb-commu-start">
            + {t('community.challenge_create')}
          </button>
        </div>
      )}

      {list === null ? (
        <Skeleton height={80} lines={2} />
      ) : list.length === 0 ? (
        <Notice>{isAdmin ? t('community.challenge_empty_admin') : t('community.challenge_empty')}</Notice>
      ) : (
        <div className="wb-commu-stack">
          {list.map((c) => {
            const state = challengeState(c, today)
            const pct = Math.min(100, Math.round((c.progress_minutes / c.target_minutes) * 100))
            const reached = c.progress_minutes >= c.target_minutes
            return (
              <div key={c.id} className={`wb-commu-box${reached ? ' is-reached' : state === 'active' ? ' is-active' : ''}`}>
                <div className="wb-commu-row">
                  <div className="wb-commu-min">
                    <p className="wb-commu-challenge">{c.title}</p>
                    <p className="wb-commu-meta">
                      {fmt(c.starts_on)} → {fmt(c.ends_on)} · {t(`community.challenge_state_${reached ? 'reached' : state}`)}
                    </p>
                  </div>
                  {isAdmin && (
                    <ConfirmButton onConfirm={async () => { await deleteChallenge(c.id); await reload() }} confirmLabel={t('actions.confirm')} ariaLabel={`${t('actions.delete')} — ${c.title}`} className="wb-btn wb-btn--danger wb-btn--sm">
                      {t('actions.delete')}
                    </ConfirmButton>
                  )}
                </div>
                <div className="wb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={c.title}>
                  <div className={`wb-progress-fill${reached ? ' is-done' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="wb-commu-meta wb-commu-nums">
                  {t('community.challenge_progress', { done: c.progress_minutes, target: c.target_minutes, pct })} · {t('community.challenge_contributors', { count: c.contributors })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
