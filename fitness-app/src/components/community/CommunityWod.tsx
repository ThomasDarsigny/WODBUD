import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchCommunityWod, pinCommunityWod, unpinCommunityWod, type CommunityWod as Wod } from '../../lib/communitySocial'
import { getLocalUser } from '../../lib/currentUser'
import { useWorkoutStore } from '../../stores/workoutStore'
import { useSessionStore } from '../../stores/sessionStore'
import ConfirmButton from '../ui/ConfirmButton'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice, SectionLabel, useTimeAgo } from './communityUi'

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
        <div className="wb-commu-box wb-commu-box--accent wb-commu-wod">
          <p className="wb-commu-meta">{t('community.wod_pinned', { when: timeAgo(wod.pinned_at) })}</p>
          <p className="wb-commu-title">{wod.title}</p>
          {wod.note && <p className="wb-commu-text">{wod.note}</p>}
          <div className="wb-commu-wod-actions">
            <button type="button" onClick={launch} disabled={sessionRunning} className="wb-btn wb-btn--primary">
              ▶ {wod.i_did ? t('community.wod_redo') : t('community.wod_start')}
            </button>
            {isAdmin && (
              <ConfirmButton onConfirm={async () => { await unpinCommunityWod(wod.id); await reload() }} confirmLabel={t('actions.confirm')} className="wb-btn wb-btn--danger">
                {t('community.wod_unpin')}
              </ConfirmButton>
            )}
          </div>
          {sessionRunning && <p className="wb-commu-meta wb-commu-gap">{t('community.wod_session_running')}</p>}

          <div className="wb-commu-doneby">
            <SectionLabel>{t('community.wod_done_by', { count: wod.done_by.length })}</SectionLabel>
            {wod.done_by.length === 0 ? (
              <p className="wb-commu-small">{t('community.wod_nobody')}</p>
            ) : (
              <ul className="wb-commu-people">
                {wod.done_by.map((d) => (
                  <li key={d.user_id} className="wb-commu-person">
                    <Avatar name={d.display_name} url={d.avatar_url} size={28} />
                    <span className="wb-commu-person-name">{d.display_name}</span>
                    <span className="wb-commu-small">{t('community.stat_minutes', { count: d.minutes })}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="wb-commu-meta wb-commu-gap">{t('community.wod_privacy')}</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="wb-commu-box wb-commu-form">
          <SectionLabel>{wod ? t('community.wod_replace') : t('community.wod_pin')}</SectionLabel>
          {mine.length === 0 ? (
            <p className="wb-commu-small">{t('community.wod_no_workouts')}</p>
          ) : (
            <>
              <select className="wb-input" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} aria-label={t('community.wod_choose')}>
                <option value=''>{t('community.wod_choose')}</option>
                {mine.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <input className="wb-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('community.wod_note_placeholder')} aria-label={t('community.wod_note_placeholder')} />
              <button type="button" onClick={() => { void pin() }} disabled={!chosen || saving} className="wb-btn wb-btn--primary wb-commu-start">
                📌 {t('community.wod_pin_action')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
