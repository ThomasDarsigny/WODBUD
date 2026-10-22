import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { challengeState, createChallenge, deleteChallenge, fetchChallenges, type CommunityChallenge } from '../../lib/communitySocial'
import { localDate } from '../../lib/scheduledWorkouts'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { btnDanger, btnPrimary, field } from '../../styles/ui'
import { cardBox, Notice, SectionLabel } from './communityUi'

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
        <div style={{ ...cardBox, marginBottom: '1.25rem', display: 'grid', gap: '0.6rem' }}>
          <SectionLabel>{t('community.challenge_new')}</SectionLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t('community.challenge_title_placeholder')} style={field} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'grid', gap: '0.25rem' }}>
              {t('community.challenge_target')}
              <input type='number' min={1} inputMode='numeric' value={target} onChange={(e) => setTarget(e.target.value)} style={field} />
            </label>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'grid', gap: '0.25rem' }}>
              {t('community.challenge_start')}
              <input type='date' value={startsOn} onChange={(e) => setStartsOn(e.target.value)} style={field} />
            </label>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'grid', gap: '0.25rem' }}>
              {t('community.challenge_end')}
              <input type='date' value={endsOn} min={startsOn} max={addDays(startsOn, 92)} onChange={(e) => setEndsOn(e.target.value)} style={field} />
            </label>
          </div>
          <button onClick={() => { void submit() }} disabled={!valid || saving} style={{ ...btnPrimary, justifySelf: 'start', opacity: !valid || saving ? 0.55 : 1 }}>
            + {t('community.challenge_create')}
          </button>
        </div>
      )}

      {list === null ? (
        <Skeleton height={80} lines={2} />
      ) : list.length === 0 ? (
        <Notice>{isAdmin ? t('community.challenge_empty_admin') : t('community.challenge_empty')}</Notice>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {list.map((c) => {
            const state = challengeState(c, today)
            const pct = Math.min(100, Math.round((c.progress_minutes / c.target_minutes) * 100))
            const reached = c.progress_minutes >= c.target_minutes
            return (
              <div key={c.id} style={{ ...cardBox, borderColor: reached ? 'rgba(34,197,94,0.45)' : state === 'active' ? 'rgba(255,77,0,0.35)' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {c.title}
                    </p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {fmt(c.starts_on)} → {fmt(c.ends_on)} · {t(`community.challenge_state_${reached ? 'reached' : state}`)}
                    </p>
                  </div>
                  {isAdmin && (
                    <ConfirmButton onConfirm={async () => { await deleteChallenge(c.id); await reload() }} confirmLabel={t('actions.confirm')} style={{ ...btnDanger, minHeight: 32, fontSize: '0.6875rem', padding: '0 0.6rem' }}>
                      {t('actions.delete')}
                    </ConfirmButton>
                  )}
                </div>
                <div style={{ height: 8, background: 'var(--black)', border: '1px solid var(--border)', borderRadius: 12, margin: '0.7rem 0 0.35rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: reached ? '#22c55e' : 'var(--orange)', transition: 'width 0.4s ease' }} />
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
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
