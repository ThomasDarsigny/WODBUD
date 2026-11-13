import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { fetchMyResults, fetchExerciseNames, formatSeconds, fromKg, readUnit, type ExerciseResult } from '../../lib/records'
import { useSessionStore } from '../../stores/sessionStore'
import { unlockAudio } from '../../lib/gymCues'
import NavIcon from '../navigation/NavIcon'
import OnboardingCard from '../onboarding/OnboardingCard'
import Skeleton from '../ui/Skeleton'
import TodayPlans from './TodayPlans'
import { MyWeekStats, useMyWeek } from './MyWeek'
import CenterSuggestionsInbox from '../center/CenterSuggestionsInbox'
import CenterFavoriteWods from '../center/CenterFavoriteWods'
import CoachGymToday from './CoachGymToday'

interface ClassPulse {
  id: string
  name: string
  members: number
  active: number
  idle: number
}

const DAY = 864e5

/**
 * Accueil du coach (3.5) : la salle d'abord — les cours du jour, leur WOD,
 * les présents, ce qu'il reste à faire —, puis son propre entraînement.
 */
export default function CoachTodayView() {
  const { t, i18n } = useTranslation(['common', 'workouts'])
  const sessionRunning = useSessionStore((s) => s.timer.startedAt !== null)
  const me = useMyWeek()
  const [classes, setClasses] = useState<ClassPulse[] | null>(null)
  const [records, setRecords] = useState<Array<ExerciseResult & { name: string }> | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: auth } = await getLocalUser()
      const user = auth.user
      if (!user) return
      const owned = await supabase.from('classes').select('id, name').eq('coach_id', user.id).order('created_at')
      if (!mounted) return

      // Pouls de chaque cours : actifs cette semaine, à relancer.
      const list = (owned.data ?? []) as Array<{ id: string; name: string }>
      const pulses = await Promise.all(list.map(async (c) => {
        const { data } = await supabase.rpc('get_class_followup', { p_class_id: c.id })
        const ath = (data ?? []) as Array<{ last_session_at: string | null }>
        const active = ath.filter((a) => a.last_session_at && Date.now() - Date.parse(a.last_session_at) < 7 * DAY).length
        return { id: c.id, name: c.name, members: ath.length, active, idle: ath.length - active }
      }))
      if (mounted) setClasses(pulses)
    })().catch(() => { if (mounted) setClasses([]) })

    fetchMyResults()
      .then(async (rows) => {
        const recent = rows.slice(0, 3)
        const names = await fetchExerciseNames([...new Set(recent.map((r) => r.exerciseId))])
        if (mounted) setRecords(recent.map((r) => ({ ...r, name: names.get(r.exerciseId) ?? '—' })))
      })
      .catch(() => { if (mounted) setRecords([]) })
    return () => { mounted = false }
  }, [])

  const today = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
  const unit = readUnit()
  const resultText = (r: ExerciseResult) => r.weightKg != null
    ? `${fromKg(r.weightKg, unit)} ${unit}${r.reps && r.reps > 1 ? ` × ${r.reps}` : ''}`
    : r.seconds != null ? formatSeconds(r.seconds) : t('records.reps_value', { count: r.reps ?? 0 })

  return (
    <div className="wb-page">
      <header className="wb-ph">
        <div>
          <p className="wb-ph-tag">{today}</p>
          <h1>{me?.firstName ? t('home.hello', { name: me.firstName }) : t('home.title')}</h1>
        </div>
        <Link to="/dashboard/workout" className="wb-btn wb-btn--secondary">+ {t('home.new_wod')}</Link>
      </header>

      {/* La salle aujourd'hui, puis ce qu'il reste à faire (3.5). */}
      <CoachGymToday classes={classes} />

      <OnboardingCard area="coach" />

      <section className="wb-home-sec">
        <div className="wb-sec">
          <h2>{t('home.my_classes')}</h2>
          <Link to="/dashboard/classes">{t('home.see_all')}</Link>
        </div>
        {classes === null ? (
          <Skeleton height={72} />
        ) : classes.length === 0 ? (
          <div className="wb-empty">
            <strong>{t('home.no_class_title')}</strong>
            <p>{t('home.no_class_hint')}</p>
            <Link to="/dashboard/classes" className="wb-btn wb-btn--ghost wb-btn--sm">{t('classes.create')}</Link>
          </div>
        ) : (
          <ul className="wb-list wb-stagger">
            {classes.map((c) => (
              <li key={c.id}>
                <Link to={`/dashboard/classes?c=${c.id}`} className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{c.name}</strong>
                    <span>{t('home.class_line', { count: c.members, active: c.active })}</span>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CenterFavoriteWods />

      <CenterSuggestionsInbox />

      {/* Mon entraînement : la séance, la semaine, les records du coach. */}
      <section className="wb-home-sec" aria-labelledby="my-training">
        <div className="wb-sec">
          <h2 id="my-training">{t('home.my_training')}</h2>
        </div>
        <div className="wb-home-actions">
          <Link to="/dashboard/session" className="wb-btn wb-btn--primary wb-btn--lg" onClick={unlockAudio}>
            ▶ {sessionRunning ? t('home.resume_session') : t('home.start_session')}
          </Link>
        </div>
      </section>

      <MyWeekStats me={me} />

      <TodayPlans basePath="/dashboard" />

      <section className="wb-home-sec">
        <div className="wb-sec">
          <h2>{t('home.my_records')}</h2>
          <Link to="/dashboard/records">{t('home.see_all')}</Link>
        </div>
        {records === null ? (
          <Skeleton height={60} />
        ) : records.length === 0 ? (
          <div className="wb-empty">
            <strong>{t('records.empty_title')}</strong>
            <p>{t('records.empty_hint')}</p>
          </div>
        ) : (
          <ul className="wb-list wb-stagger">
            {records.map((r) => (
              <li key={r.id}>
                <Link to={`/dashboard/records?ex=${r.exerciseId}`} className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="records" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{r.name}</strong>
                    <span>{new Date(r.performedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="wb-row-side">{resultText(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
