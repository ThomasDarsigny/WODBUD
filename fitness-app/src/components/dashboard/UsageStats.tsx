import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import WeeklyColumns from '../charts/WeeklyColumns'
import Skeleton from '../ui/Skeleton'

/** Ce que rend admin_usage_stats (migration 074) : des totaux, jamais une ligne par personne. */
export interface UsageStatsData {
  active_7d: number
  active_30d: number
  platforms_30d: Partial<Record<'web' | 'pwa' | 'android' | 'ios', number>>
  new_accounts_30d: number
  accounts: number
  sessions_7d: number
  checkins_7d: number
  wods_30d: number
  plans_30d: number
  weekly_active: { week: string; users: number }[]
  centers: { name: string; members: number; active_7d: number }[]
}

const PLATFORMS = ['web', 'pwa', 'android', 'ios'] as const

function isStats(v: unknown): v is UsageStatsData {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'active_7d' in v && Array.isArray((v as UsageStatsData).weekly_active)
}

/** Administration : de quoi mesurer le test au gym, sans service d'analyse externe. */
export default function UsageStats() {
  const { t, i18n } = useTranslation('common')
  const [stats, setStats] = useState<UsageStatsData | null | 'unavailable'>(null)

  useEffect(() => {
    let alive = true
    supabase
      .rpc('admin_usage_stats', { p_weeks: 8 })
      .then(({ data, error }) => {
        if (!alive) return
        setStats(!error && isStats(data) ? data : 'unavailable')
      })
    return () => { alive = false }
  }, [])

  const n = (v: number) => v.toLocaleString(i18n.language)

  return (
    <section className="wb-home-sec" aria-labelledby="usage-title">
      <div className="wb-sec"><h2 id="usage-title">{t('usage.title')}</h2></div>
      <p className="wb-set-hint is-lead">{t('usage.hint')}</p>
      {stats === null ? (
        <Skeleton height={72} lines={2} />
      ) : stats === 'unavailable' ? (
        <div className="wb-empty"><p>{t('usage.unavailable')}</p></div>
      ) : (
        <>
          <div className="wb-admin-stats">
            <Tile value={n(stats.active_7d)} label={t('usage.active_7d')} accent />
            <Tile value={n(stats.active_30d)} label={t('usage.active_30d')} />
            <Tile value={n(stats.new_accounts_30d)} label={t('usage.new_accounts_30d')} />
            <Tile value={n(stats.accounts)} label={t('usage.accounts')} />
            <Tile value={n(stats.sessions_7d)} label={t('usage.sessions_7d')} />
            <Tile value={n(stats.checkins_7d)} label={t('usage.checkins_7d')} />
            <Tile value={n(stats.wods_30d)} label={t('usage.wods_30d')} />
            <Tile value={n(stats.plans_30d)} label={t('usage.plans_30d')} />
          </div>

          <div className="wb-usage-platforms">
            <h3>{t('usage.platforms_title')}</h3>
            <ul>
              {PLATFORMS.map((p) => (
                <li key={p}><strong>{n(stats.platforms_30d[p] ?? 0)}</strong> {t(`usage.platform_${p}`)}</li>
              ))}
            </ul>
            <p className="wb-set-hint">{t('usage.platforms_hint')}</p>
          </div>

          {stats.weekly_active.some((w) => w.users > 0) && (
            <div className="wb-card wb-usage-trend">
              <WeeklyColumns
                title={t('usage.weekly_title')}
                weeks={stats.weekly_active.map((w) => w.week)}
                values={stats.weekly_active.map((w) => w.users)}
                format={(v) => t('usage.weekly_value', { count: v })}
                short={(v) => String(Math.round(v))}
              />
            </div>
          )}

          {stats.centers.length > 0 && (
            <div className="wb-usage-centers">
              <table>
                <caption>{t('usage.centers_title')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('usage.col_center')}</th>
                    <th scope="col">{t('usage.col_members')}</th>
                    <th scope="col">{t('usage.col_active_7d')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.centers.map((c, i) => (
                    <tr key={`${c.name}-${i}`}>
                      <th scope="row">{c.name}</th>
                      <td>{n(c.members)}</td>
                      <td>{n(c.active_7d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Tile({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`wb-stat${accent ? ' wb-stat--accent' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
