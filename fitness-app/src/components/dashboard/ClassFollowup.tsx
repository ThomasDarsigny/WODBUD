import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../community/communityUi'
import Skeleton from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'

interface Row {
  athlete_id: string
  full_name: string | null
  avatar_url: string | null
  joined_at: string
  last_session_at: string | null
  sessions_7d: number
  minutes_7d: number
  sessions_30d: number
  minutes_30d: number
  current_streak: number
}

type Status = 'active' | 'idle' | 'never'
type Filter = 'all' | 'idle' | 'active'

const DAY = 864e5
/** Sans séance depuis une semaine : c'est le moment de relancer. */
const IDLE_DAYS = 7

function statusOf(r: Row, now: number): { status: Status; days: number | null } {
  if (!r.last_session_at) return { status: 'never', days: null }
  const days = Math.floor((now - Date.parse(r.last_session_at)) / DAY)
  return { status: days < IDLE_DAYS ? 'active' : 'idle', days }
}

/**
 * Suivi du cours : qui s'entraîne, qui décroche. Le coach voit des comptes
 * (séances, minutes, série), jamais le contenu des séances.
 */
export default function ClassFollowup({ classId }: { classId: string }) {
  const { t } = useTranslation('common')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let mounted = true
    supabase.rpc('get_class_followup', { p_class_id: classId }).then(({ data, error: err }) => {
      if (!mounted) return
      if (err) { setError(err.message); setRows([]); return }
      setRows((data ?? []) as Row[])
    })
    return () => { mounted = false }
  }, [classId])

  const enriched = useMemo(() => (rows ?? []).map((r) => ({ ...r, ...statusOf(r, now) })), [rows, now])
  const active = enriched.filter((r) => r.status === 'active').length
  const idle = enriched.filter((r) => r.status !== 'active').length
  const minutes7 = enriched.reduce((s, r) => s + r.minutes_7d, 0)
  const shown = enriched
    .filter((r) => filter === 'all' || (filter === 'active' ? r.status === 'active' : r.status !== 'active'))
    // À relancer d'abord : le plus longtemps absent en tête.
    .sort((a, b) => filter === 'idle' ? (b.days ?? 1e9) - (a.days ?? 1e9) : 0)

  if (rows === null) {
    return <div style={{ display: 'grid', gap: '0.6rem' }}><Skeleton height={76} /><Skeleton height={64} /><Skeleton height={64} /></div>
  }
  if (error) return <p className="wb-rec-error" role="alert">{error}</p>
  if (rows.length === 0) {
    return <EmptyState icon="classes" title={t('followup.empty_title')} hint={t('followup.empty_hint')} compact />
  }

  return (
    <section className="wb-fu">
      <div className="wb-fu-stats">
        <div><strong>{active}<small>/{rows.length}</small></strong><span>{t('followup.stat_active')}</span></div>
        <div data-tone={idle ? 'warn' : undefined}><strong>{idle}</strong><span>{t('followup.stat_idle')}</span></div>
        <div><strong>{minutes7}</strong><span>{t('followup.stat_minutes')}</span></div>
      </div>

      <div className="wb-segmented wb-fu-filter" role="tablist" aria-label={t('followup.filter')}>
        {(['all', 'idle', 'active'] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : undefined} onClick={() => setFilter(f)}>
            {t(`followup.filter_${f}`)}
            {f === 'idle' && idle > 0 && <span className="wb-segmented-count">{idle}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="wb-rec-hint">{t(filter === 'idle' ? 'followup.none_idle' : 'followup.none_active')}</p>
      ) : (
        <ul className="wb-fu-list">
          {shown.map((r) => {
            const name = r.full_name || t('followup.no_name')
            return (
              <li key={r.athlete_id} data-status={r.status}>
                <Avatar name={name} url={r.avatar_url} size={44} />
                <div className="wb-fu-main">
                  <strong>{name}</strong>
                  <span>
                    {r.status === 'never'
                      ? t('followup.never')
                      : t('followup.week', { sessions: r.sessions_7d, minutes: r.minutes_7d, count: r.sessions_7d })}
                    {r.sessions_30d > 0 && ` · ${t('followup.month', { count: r.sessions_30d })}`}
                  </span>
                </div>
                <div className="wb-fu-side">
                  <span className="wb-fu-pill" data-status={r.status}>
                    {r.status === 'active'
                      ? (r.days === 0 ? t('followup.today') : t('followup.days_ago', { count: r.days ?? 0 }))
                      : r.status === 'idle'
                        ? t('followup.idle_days', { count: r.days ?? 0 })
                        : t('followup.never_short')}
                  </span>
                  {r.current_streak > 1 && <span className="wb-fu-streak">🔥 {r.current_streak} {t('followup.streak_unit')}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="wb-fu-note">{t('followup.privacy')}</p>
    </section>
  )
}
