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
import TodayPlans from '../home/TodayPlans'
import { MyWeekStats, useMyWeek } from '../home/MyWeek'

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

      <Link to="/athlete/session" className="wb-btn wb-btn--primary wb-btn--lg" onClick={unlockAudio}>
        ▶ {sessionRunning ? t('home.resume_session') : t('home.start_session')}
      </Link>

      <MyWeekStats me={me} />

      <TodayPlans basePath="/athlete" />

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

function ClassCard({ cls, currentUserId }: { cls: Class; currentUserId: string | null }) {
  const { t } = useTranslation('common')
  // Replié par défaut : le classement se charge seulement si on le demande,
  // ce qui évite autant de requêtes que de cours à l'ouverture de l'écran.
  const [showBoard, setShowBoard] = useState(false)

  return (
    <div className="wb-card wb-class-card">
      <div className="wb-class-head">
        <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
        <div>
          <strong>{cls.name}</strong>
          {cls.schedule && <span>{cls.schedule}</span>}
        </div>
      </div>
      {cls.description && <p className="wb-cardio-hint">{cls.description}</p>}
      <button type="button" className="wb-wod-toggle" onClick={() => setShowBoard((v) => !v)} aria-expanded={showBoard}>
        <span aria-hidden="true">{showBoard ? '▾' : '▸'}</span> {showBoard ? t('leaderboard.hide') : t('leaderboard.title')}
      </button>
      {showBoard && <ClassLeaderboard classId={cls.id} currentUserId={currentUserId} />}
    </div>
  )
}
