import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { localDate } from '../../lib/scheduledWorkouts'
import { shiftDate } from '../../lib/planWeek'
import { formatSlotTime, nextOccurrence } from '../../lib/classSlots'
import { gymToday, unplannedDays, type HomePlan } from '../../lib/coachHome'
import { isVoteSessionOpen } from '../../lib/voteSessions'
import { useClassSlotStore } from '../../stores/classSlotStore'
import NavIcon from '../navigation/NavIcon'
import type { VoteSessionStatus } from '../../types'
import Skeleton from '../ui/Skeleton'

export interface CoachClassPulse { id: string; name: string; idle: number }

interface Loaded {
  plans: HomePlan[]
  present: Record<string, number>
  openVotes: number
}

/**
 * Accueil du coach (3.5) : la salle aujourd'hui (chaque cours du jour, son
 * WOD, ses présents, les raccourcis), puis ce qu'il reste à faire.
 */
export default function CoachGymToday({ classes }: { classes: CoachClassPulse[] | null }) {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language
  const today = localDate()
  const slotsByClass = useClassSlotStore((s) => s.byClass)
  const fetchSlots = useClassSlotStore((s) => s.fetchSlots)
  const [data, setData] = useState<Loaded | null>(null)
  const ids = (classes ?? []).map((c) => c.id).join(',')

  useEffect(() => {
    if (!ids) return
    let alive = true
    const list = ids.split(',')
    void fetchSlots(list)
    Promise.all([
      supabase.from('class_plans').select('id, class_id, scheduled_date, title, workouts(title)').in('class_id', list).gte('scheduled_date', today).lte('scheduled_date', shiftDate(today, 6)),
      supabase.from('class_attendance').select('class_id').in('class_id', list).eq('session_date', today),
      supabase.from('vote_sessions').select('id, status, deadline').in('class_id', list).eq('status', 'open')
    ]).then(([plans, att, votes]) => {
      if (!alive) return
      const present: Record<string, number> = {}
      for (const r of att.data ?? []) present[r.class_id] = (present[r.class_id] ?? 0) + 1
      setData({
        plans: (plans.data ?? []).map((p) => ({ id: p.id, class_id: p.class_id, scheduled_date: p.scheduled_date, title: p.title || p.workouts?.title || null })),
        present,
        openVotes: (votes.data ?? []).filter((v) => isVoteSessionOpen({ status: v.status as VoteSessionStatus, deadline: v.deadline })).length
      })
    }).catch(() => { if (alive) setData({ plans: [], present: {}, openVotes: 0 }) })
    return () => { alive = false }
  }, [ids, today, fetchSlots])

  const entries = useMemo(() => (classes && data ? gymToday(classes, slotsByClass, data.plans, data.present, today) : null), [classes, data, slotsByClass, today])
  const todo = useMemo(() => {
    if (!classes || !data) return null
    return classes.map((c) => ({
      ...c,
      unplanned: unplannedDays(slotsByClass[c.id] ?? [], data.plans.filter((p) => p.class_id === c.id), today)
    }))
  }, [classes, data, slotsByClass, today])

  if (classes !== null && classes.length === 0) return null

  // Pas de cours aujourd'hui : le prochain, tous cours confondus.
  const next = (classes ?? [])
    .map((c) => ({ c, o: nextOccurrence(slotsByClass[c.id] ?? []) }))
    .filter((x): x is { c: CoachClassPulse; o: NonNullable<typeof x.o> } => x.o !== null)
    .sort((a, b) => a.o.date.localeCompare(b.o.date) || a.o.slot.start_time.localeCompare(b.o.slot.start_time))[0]
  const hasSchedule = (classes ?? []).some((c) => (slotsByClass[c.id] ?? []).length > 0)
  const fmtDay = (iso: string, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString(lang, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric' })

  const unplannedRows = (todo ?? []).filter((c) => c.unplanned.length > 0)
  const idleRows = (todo ?? []).filter((c) => c.idle > 0)
  const todoCount = unplannedRows.length + idleRows.length + (data?.openVotes ? 1 : 0)

  return (
    <>
      <section className="wb-home-sec" aria-labelledby="gym-today">
        <div className="wb-sec">
          <h2 id="gym-today">{t('home.gym_title')}</h2>
        </div>
        {entries === null ? (
          <Skeleton height={96} />
        ) : entries.length === 0 ? (
          <div className="wb-empty">
            <strong>{t('home.gym_none_title')}</strong>
            <p>
              {next
                ? t('home.gym_next', { when: `${fmtDay(next.o.date, true)} · ${formatSlotTime(next.o.slot.start_time, lang)}`, name: next.c.name })
                : hasSchedule ? null : t('home.gym_no_schedule')}
            </p>
          </div>
        ) : (
          <ul className="wb-floor-list">
            {entries.map((e) => (
              <li key={e.classId} className="wb-floor-card">
                <span className="wb-floor-time">{e.times.length ? e.times.map((s) => formatSlotTime(s, lang)).join(' · ') : '—'}</span>
                <span className="wb-floor-main">
                  <strong>{e.name}</strong>
                  <span className={e.plan ? 'wb-floor-wod' : 'wb-floor-wod is-empty'}>{e.plan ? e.plan.title ?? t('tv.wod') : t('home.gym_nothing_planned')}</span>
                  <span className="wb-floor-present">{t('home.gym_present', { count: e.present })}</span>
                </span>
                <span className="wb-floor-actions">
                  {!e.plan && <Link to={`/dashboard/classes?c=${e.classId}&tab=planning`} className="wb-btn wb-btn--primary wb-btn--sm">{t('home.gym_program')}</Link>}
                  <a href={`/tv/${e.classId}`} target="_blank" rel="noopener" className="wb-btn wb-btn--secondary wb-btn--sm">{t('tv.open')}</a>
                  <Link to={`/dashboard/classes?c=${e.classId}`} className="wb-btn wb-btn--ghost wb-btn--sm">{t('home.gym_attendance')}</Link>
                  {e.plan && <Link to={`/dashboard/whiteboard/${e.plan.id}`} className="wb-btn wb-btn--ghost wb-btn--sm">{t('home.gym_board')}</Link>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wb-home-sec" aria-labelledby="coach-todo">
        <div className="wb-sec">
          <h2 id="coach-todo">{t('home.todo_title')}</h2>
        </div>
        {todo === null ? (
          <Skeleton height={60} />
        ) : todoCount === 0 ? (
          <div className="wb-empty">
            <strong>{t('home.todo_none')}</strong>
            <p>{t('home.todo_none_hint')}</p>
          </div>
        ) : (
          <ul className="wb-list">
            {unplannedRows.map((c) => (
              <li key={`u-${c.id}`}>
                <Link to={`/dashboard/classes?c=${c.id}&tab=planning`} className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="calendar" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{t('home.todo_unplanned', { count: c.unplanned.length })}</strong>
                    <span>{c.name} · {c.unplanned.map((d) => fmtDay(d)).join(', ')}</span>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
            {idleRows.map((c) => (
              <li key={`i-${c.id}`}>
                <Link to={`/dashboard/classes?c=${c.id}`} className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="classes" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{t('home.todo_idle', { count: c.idle })}</strong>
                    <span>{c.name}</span>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
            {data && data.openVotes > 0 && (
              <li>
                <Link to="/dashboard/vote" className="wb-row">
                  <span className="wb-row-icon"><NavIcon name="vote" size={20} /></span>
                  <span className="wb-row-main">
                    <strong>{t('home.todo_votes', { count: data.openVotes })}</strong>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>
    </>
  )
}
