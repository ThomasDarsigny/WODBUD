import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchCommunityWod, pinCommunityWod, unpinCommunityWod, type CommunityWod as Wod } from '../../lib/communitySocial'
import { getLocalUser } from '../../lib/currentUser'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useSessionStore } from '../../stores/sessionStore'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { btnDanger, btnPrimary, field } from '../../styles/ui'
import { Avatar, cardBox, Notice, SectionLabel, useTimeAgo } from './communityUi'

/** Le WOD épinglé par un admin : les membres le lancent en un clic. */
export default function CommunityWod({ communityId, isAdmin, basePath }: {
  communityId: string
  isAdmin: boolean
  basePath: string
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const timeAgo = useTimeAgo()
  const startSession = useSessionStore((s) => s.startSession)
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const { savedWorkouts, fetchWorkouts } = useWorkoutStore()
  const [wod, setWod] = useState<Wod | null | undefined>(undefined)
  const [userId, setUserId] = useState<string | null>(null)
  const [workoutId, setWorkoutId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    try { setWod(await fetchCommunityWod(communityId)) } catch (err) { setError(err instanceof Error ? err.message : t('errors.generic')) }
  }, [communityId, t])

  useEffect(() => {
    let mounted = true
    fetchCommunityWod(communityId)
      .then((row) => { if (mounted) setWod(row) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [communityId, t])

  useEffect(() => {
    if (!isAdmin) return
    void fetchWorkouts()
    getLocalUser().then(({ data }) => setUserId(data.user?.id ?? null)).catch(() => {})
  }, [isAdmin, fetchWorkouts])

  // On n'épingle que ses propres WODs (règle de la base).
  const mine = savedWorkouts.filter((w) => w.created_by === userId)
  const chosen = mine.find((w) => w.id === workoutId)

  async function pin() {
    if (!chosen) return
    setSaving(true)
    setError(null)
    try {
      await pinCommunityWod(communityId, chosen.id, chosen.name, note)
      setWorkoutId('')
      setNote('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  function launch() {
    if (!wod) return
    startSession(wod.workout_id, wod.title)
    navigate(`${basePath}/session`)
  }

  return (
    <div>
      {error && <Notice tone='error'>{error}</Notice>}

      {wod === undefined ? (
        <Skeleton height={120} />
      ) : wod === null ? (
        <Notice>{isAdmin ? t('community.wod_empty_admin') : t('community.wod_empty')}</Notice>
      ) : (
        <div style={{ ...cardBox, borderColor: 'rgba(255,77,0,0.35)', marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>{t('community.wod_pinned', { when: timeAgo(wod.pinned_at) })}</p>
          <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--font-d)', fontSize: '1.375rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{wod.title}</p>
          {wod.note && <p style={{ margin: '0.4rem 0 0', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>{wod.note}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
            <button onClick={launch} disabled={sessionRunning} style={{ ...btnPrimary, opacity: sessionRunning ? 0.55 : 1 }}>
              ▶ {wod.i_did ? t('community.wod_redo') : t('community.wod_start')}
            </button>
            {isAdmin && (
              <ConfirmButton onConfirm={async () => { await unpinCommunityWod(wod.id); await reload() }} confirmLabel={t('actions.confirm')} style={{ ...btnDanger }}>
                {t('community.wod_unpin')}
              </ConfirmButton>
            )}
          </div>
          {sessionRunning && <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>{t('community.wod_session_running')}</p>}

          <div style={{ marginTop: '1.1rem' }}>
            <SectionLabel>{t('community.wod_done_by', { count: wod.done_by.length })}</SectionLabel>
            {wod.done_by.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>{t('community.wod_nobody')}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {wod.done_by.map((d) => (
                  <li key={d.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Avatar name={d.display_name} url={d.avatar_url} size={28} />
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{d.display_name}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{t('community.stat_minutes', { count: d.minutes })}</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>{t('community.wod_privacy')}</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ ...cardBox, display: 'grid', gap: '0.6rem' }}>
          <SectionLabel>{wod ? t('community.wod_replace') : t('community.wod_pin')}</SectionLabel>
          {mine.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>{t('community.wod_no_workouts')}</p>
          ) : (
            <>
              <select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} style={field}>
                <option value=''>{t('community.wod_choose')}</option>
                {mine.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('community.wod_note_placeholder')} style={field} />
              <button onClick={() => { void pin() }} disabled={!chosen || saving} style={{ ...btnPrimary, justifySelf: 'start', opacity: !chosen || saving ? 0.55 : 1 }}>
                📌 {t('community.wod_pin_action')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
