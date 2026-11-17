import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { getLocalUser } from '../../lib/currentUser'
import { formatMinutes } from '../../lib/ranks'
import { AnimatedNumber } from '../ui/motion'
import WeeklyColumns from '../charts/WeeklyColumns'
import { localDate } from '../../lib/scheduledWorkouts'
import { lastWeeks, totalsByWeek } from '../../lib/weekly'

export interface MyWeek {
  firstName: string
  streak: number
  weekMinutes: number
  weekSessions: number
}

const DAY = 864e5

/** Prénom, série et volume des 7 derniers jours — l'en-tête des deux accueils. */
export function useMyWeek(): MyWeek | null {
  const [me, setMe] = useState<MyWeek | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: auth } = await getLocalUser()
      const user = auth.user
      if (!user) return
      const since = new Date(Date.now() - 7 * DAY).toISOString()
      const [profile, sessions] = await Promise.all([
        supabase.from('profiles').select('full_name, current_streak').eq('id', user.id).maybeSingle(),
        supabase.from('workout_sessions').select('active_minutes').eq('user_id', user.id).gte('performed_at', since)
      ])
      if (!mounted) return
      const rows = (sessions.data ?? []) as Array<{ active_minutes: number | null }>
      setMe({
        firstName: (profile.data?.full_name ?? '').trim().split(/\s+/)[0] ?? '',
        streak: profile.data?.current_streak ?? 0,
        weekMinutes: rows.reduce((s, r) => s + (r.active_minutes ?? 0), 0),
        weekSessions: rows.filter((r) => (r.active_minutes ?? 0) > 0).length
      })
    })().catch(() => { /* les tuiles restent à « – » */ })
    return () => { mounted = false }
  }, [])
  return me
}

/** Tes minutes actives sur 8 semaines (constat 08) : rien tant qu'il n'y en a aucune. */
export function MyMinutesTrend() {
  const { t } = useTranslation('common')
  const [values, setValues] = useState<{ weeks: string[]; totals: number[] } | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: auth } = await getLocalUser()
      if (!auth.user) return
      const weeks = lastWeeks(8, localDate())
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('performed_at, active_minutes')
        .eq('user_id', auth.user.id)
        .gte('performed_at', `${weeks[0]}T00:00:00`)
      if (error || !alive) return
      const rows = (data ?? []).map((r) => ({ date: localDate(new Date(r.performed_at)), value: r.active_minutes ?? 0 }))
      setValues({ weeks, totals: totalsByWeek(rows, weeks) })
    })().catch(() => { /* la tendance est un bonus */ })
    return () => { alive = false }
  }, [])
  if (!values || values.totals.every((v) => v === 0)) return null
  return (
    <div className="wb-card wb-home-trend">
      <WeeklyColumns
        title={t('home.trend_title')}
        weeks={values.weeks}
        values={values.totals}
        format={formatMinutes}
        short={(n) => String(Math.round(n))}
      />
    </div>
  )
}

export function MyWeekStats({ me }: { me: MyWeek | null }) {
  const { t } = useTranslation('common')
  return (
    <div className="wb-stats">
      <div className="wb-stat wb-stat--accent">
        <strong>{me ? <AnimatedNumber value={me.streak} /> : '–'}<small>{t('home.days_unit')}</small></strong>
        <span>{t('home.stat_streak')}</span>
      </div>
      <div className="wb-stat">
        <strong>{me ? <AnimatedNumber value={me.weekMinutes} format={formatMinutes} /> : '–'}</strong>
        <span>{t('home.stat_week_minutes')}</span>
      </div>
      <div className="wb-stat">
        <strong>{me ? <AnimatedNumber value={me.weekSessions} /> : '–'}</strong>
        <span>{t('home.stat_week_sessions')}</span>
      </div>
    </div>
  )
}
