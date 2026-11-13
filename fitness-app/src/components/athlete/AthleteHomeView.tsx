import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavIcon from '../navigation/NavIcon'
import EmptyState from '../ui/EmptyState'
import { useClassStore } from '../../stores/classStore'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { VoteSession, Class } from '../../types'
import Skeleton from '../ui/Skeleton'
import { getLocalUser } from '../../lib/currentUser'
import ClassLeaderboard from '../rank/ClassLeaderboard'
import OnboardingCard from '../onboarding/OnboardingCard'
import FeatureTopicsCard from '../vote/FeatureTopicsCard'
import { isVoteSessionOpen } from '../../lib/voteSessions'
import { useSessionStore } from '../../stores/sessionStore'
import { unlockAudio } from '../../lib/gymCues'
import TodayWod from '../home/TodayWod'
import { MyWeekStats, useMyWeek } from '../home/MyWeek'
import { useClassSlotStore } from '../../stores/classSlotStore'
import { formatSlotTime, nextOccurrence, summarizeSlots, type ClassSlot } from '../../lib/classSlots'
import { checkIn, fetchMyAttendance, selfCheckInSlot } from '../../lib/attendance'
import { localDate } from '../../lib/scheduledWorkouts'

export default function AthleteHomeView() {
  const { t, i18n } = useTranslation(['common', 'exercises'])
  const navigate = useNavigate()
  const me = useMyWeek()
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const { classes, fetchMyClasses } = useClassStore()
  const { exercises, fetchExercises } = useExerciseStore()

  const [openSessions, setOpenSessions] = useState<(VoteSession & { class_name?: string })[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  // Sert uniquement à surligner sa propre ligne dans le classement.
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getLocalUser()
      .then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const { fetchOpenVoteSessions, userVotesBySession } = useClassStore()

  useEffect(() => {
    fetchMyClasses()
    fetchExercises()
  }, [fetchMyClasses, fetchExercises])

  // Horaire de mes cours (3.1).
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)
  const myClassIds = classes.map((c) => c.id).join(',')
  useEffect(() => { if (myClassIds) void fetchSlots(myClassIds.split(',')) }, [myClassIds, fetchSlots])

  useEffect(() => {
    let mounted = true
    // Pas de setLoadingSessions(true) synchrone ici : l'état initial vaut déjà
    // `true`, et le remettre pendant l'effet déclenche un rendu en cascade.
    fetchOpenVoteSessions()
      // `status = 'open'` côté requête ne dit rien de l'échéance : un vote
      // resté « open » depuis des mois parce que personne ne l'a fermé à la
      // main apparaîtrait comme actif ici, pour finir bloqué par la RLS une
      // fois l'athlète rendu à l'écran de vote (migration 024).
      .then((sessions) => { if (mounted) setOpenSessions(sessions.filter(isVoteSessionOpen)) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingSessions(false) })
    return () => { mounted = false }
  }, [fetchOpenVoteSessions])

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))

  const today = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{today}</p>
          <h1>{me?.firstName ? t('home.hello', { name: me.firstName }) : t('athlete.welcome_title')}</h1>
        </div>
      </header>

      {/* Le WOD du jour de mon cours passe avant tout le reste (1.3). */}
      <TodayWod />

      <Link to="/athlete/session" className="wb-btn wb-btn--primary wb-btn--lg" onClick={unlockAudio}>
        ▶ {sessionRunning ? t('home.resume_session') : t('home.start_session')}
      </Link>

      <MyWeekStats me={me} />

      <OnboardingCard area="athlete" />

      {/* Votes ouverts : la section n'existe que s'il y a de quoi voter. */}
      {(loadingSessions || openSessions.length > 0) && (
        <section className="wb-home-sec">
          <div className="wb-sec"><h2>{t('athlete.section_votes')}</h2></div>
          {loadingSessions ? (
            <Skeleton height={72} />
          ) : (
            <div className="wb-grid">
              {openSessions.map((session) => (
                <VoteSessionCard
                  key={session.id}
                  session={session}
                  exerciseMap={exerciseMap}
                  hasVoted={(userVotesBySession[session.id]?.length ?? 0) > 0}
                  onVote={() => navigate(`/athlete/vote/${session.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="wb-home-sec">
        <div className="wb-sec"><h2>{t('athlete.section_classes')}</h2></div>
        {classes.length === 0 ? (
          <EmptyState compact icon="classes" title={t('athlete.no_classes')} hint={t('athlete.no_classes_hint')} />
        ) : (
          <div className="wb-grid wb-grid--2">
            {classes.map((cls) => <ClassCard key={cls.id} cls={cls} currentUserId={userId} />)}
          </div>
        )}
      </section>

      <FeatureTopicsCard />
    </div>
  )
}

function VoteSessionCard({ session, exerciseMap, hasVoted, onVote }: {
  session: VoteSession & { class_name?: string }
  exerciseMap: Map<string, import('../../types').Exercise>
  hasVoted: boolean
  onVote: () => void
}) {
  const { t } = useTranslation(['common', 'exercises'])
  return (
    <div className={`wb-card${hasVoted ? '' : ' wb-card--accent'} wb-vote-card`}>
      <div className="wb-vote-main">
        <div className="wb-vote-title">
          <strong>{session.title}</strong>
          {hasVoted && <span className="wb-pill wb-pill--green">✓ {t('vote.voted')}</span>}
        </div>
        <div className="wb-vote-opts">
          {session.exercise_options.slice(0, 4).map((exId) => {
            const ex = exerciseMap.get(exId)
            return ex ? <span key={exId} className="wb-pill">{ex.name}</span> : null
          })}
          {session.exercise_options.length > 4 && <span className="wb-ex-more">+{session.exercise_options.length - 4}</span>}
        </div>
        {session.deadline && (
          <span className="wb-vote-deadline">{t('classes.deadline')} : {new Date(session.deadline).toLocaleDateString()}</span>
        )}
      </div>
      <button type="button" className={`wb-btn ${hasVoted ? 'wb-btn--secondary' : 'wb-btn--primary'}`} onClick={onVote}>
        {hasVoted ? t('vote.modify') : t('athlete.vote_cta')}
      </button>
    </div>
  )
}

const NO_SLOTS: ClassSlot[] = []

function ClassCard({ cls, currentUserId }: { cls: Class; currentUserId: string | null }) {
  const { t, i18n } = useTranslation('common')
  const slots = useClassSlotStore((s) => s.byClass[cls.id] ?? NO_SLOTS)
  const next = nextOccurrence(slots)
  const lang = i18n.language
  const when = next
    ? next.ongoing
      ? t('classes.sched_ongoing', { time: formatSlotTime(next.slot.start_time, lang) })
      : t('classes.sched_next', { when: `${new Date(`${next.date}T12:00:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatSlotTime(next.slot.start_time, lang)}` })
    : null
  // Présence (3.2) : de 30 min avant à 30 min après le cours du jour.
  const today = localDate()
  const liveSlot = selfCheckInSlot(slots, today)
  const hasLiveSlot = Boolean(liveSlot)
  const [present, setPresent] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState(false)
  useEffect(() => {
    if (!hasLiveSlot || !currentUserId) return
    let alive = true
    fetchMyAttendance(cls.id, currentUserId, today).then((row) => { if (alive) setPresent(Boolean(row)) }).catch(() => { if (alive) setPresent(false) })
    return () => { alive = false }
  }, [hasLiveSlot, currentUserId, cls.id, today])
  async function imHere() {
    setChecking(true)
    setCheckError(false)
    try {
      const result = await checkIn(cls.id, today, null)
      if (result === 'ok' || result === 'already') setPresent(true)
      else setCheckError(true)
    } catch {
      setCheckError(true)
    } finally {
      setChecking(false)
    }
  }
  // Replié par défaut : le classement se charge seulement si on le demande,
  // ce qui évite autant de requêtes que de cours à l'ouverture de l'écran.
  const [showBoard, setShowBoard] = useState(false)

  return (
    <div className="wb-card wb-class-card">
      <div className="wb-class-head">
        <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
        <div>
          <strong>{cls.name}</strong>
          {slots.length ? <span>{summarizeSlots(slots, lang)}</span> : cls.schedule && <span>{cls.schedule}</span>}
        </div>
      </div>
      {when && <p className={`wb-class-next${next?.ongoing ? ' is-live' : ''}`}>{when}</p>}
      {liveSlot && present === true && (
        <p className="wb-class-present">✓ {t('attendance.self_done', { time: formatSlotTime(liveSlot.start_time, lang) })}</p>
      )}
      {liveSlot && present === false && (
        <button type="button" className="wb-btn wb-btn--primary wb-class-here" disabled={checking} onClick={() => { void imHere() }}>
          {t('attendance.self_cta')}
        </button>
      )}
      {checkError && <p className="wb-rec-error" role="alert">{t('attendance.err_error')}</p>}
      {cls.description && <p className="wb-cardio-hint">{cls.description}</p>}
      <button type="button" className="wb-wod-toggle" onClick={() => setShowBoard((v) => !v)} aria-expanded={showBoard}>
        <span aria-hidden="true">{showBoard ? '▾' : '▸'}</span> {showBoard ? t('leaderboard.hide') : t('leaderboard.title')}
      </button>
      {showBoard && <ClassLeaderboard classId={cls.id} currentUserId={currentUserId} />}
    </div>
  )
}
