import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCommunityLeaderboard, type CommunityLeaderRow, type CommunityPeriod } from '../../lib/communitySocial'
import type { CommunityMember } from '../../lib/communityMembers'
import { rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice } from './communityUi'

type Period = CommunityPeriod | 'all'

/**
 * Semaine et mois : minutes depuis le début de la période (pour que les
 * nouveaux aient leur chance). Depuis toujours : total et rang, tirés de
 * la liste des membres. Uniquement ceux qui partagent leur rang.
 */
export default function CommunityLeaderboard({ communityId, members, onOpenMember }: {
  communityId: string
  members: CommunityMember[]
  onOpenMember: (userId: string) => void
}) {
  const { t, i18n } = useTranslation('common')
  const { ranks, fetchAll } = useRankStore()
  const [period, setPeriod] = useState<Period>('week')
  const [rows, setRows] = useState<{ key: string; list: CommunityLeaderRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    if (period === 'all') return
    let mounted = true
    const key = `${communityId}:${period}`
    fetchCommunityLeaderboard(communityId, period)
      .then((list) => { if (mounted) setRows({ key, list }) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [communityId, period, t])

  const allTime: CommunityLeaderRow[] = members
    .filter((m) => m.share_rank && m.total_minutes !== null)
    .map((m) => ({ user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url, minutes: m.total_minutes ?? 0, is_me: m.is_me }))
    .sort((a, b) => b.minutes - a.minutes)

  const list = period === 'all' ? allTime : rows?.key === `${communityId}:${period}` ? rows.list : null

  return (
    <div>
      <div role='tablist' style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['week', 'month', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            role='tab'
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            style={{ fontFamily: 'var(--font-d)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.4rem 0.8rem', cursor: 'pointer', color: period === p ? 'var(--black)' : 'var(--muted)', background: period === p ? 'var(--orange)' : 'transparent', border: `1px solid ${period === p ? 'var(--orange)' : 'var(--border)'}`, borderRadius: 12 }}
          >
            {t(`community.period_${p}`)}
          </button>
        ))}
      </div>

      {error && <Notice tone='error'>{error}</Notice>}

      {list === null ? (
        <Skeleton height={48} lines={3} />
      ) : list.length === 0 ? (
        <Notice>{t('community.leaderboard_empty')}</Notice>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {list.map((row, i) => {
            // Ex æquo : même place pour les mêmes minutes.
            const place = list.findIndex((r) => r.minutes === row.minutes) + 1
            const member = members.find((m) => m.user_id === row.user_id)
            const rank = period === 'all' ? ranks.find((r) => r.key === member?.rank_key) : undefined
            return (
              <li key={row.user_id}>
                <button
                  onClick={() => onOpenMember(row.user_id)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', border: `1px solid ${row.is_me ? 'rgba(255,77,0,0.45)' : 'var(--border)'}`, borderRadius: 12, background: row.is_me ? 'rgba(255,77,0,0.06)' : 'var(--dark)', padding: '0.6rem 0.75rem', cursor: 'pointer', color: 'var(--white)' }}
                >
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '1rem', fontWeight: 900, width: '1.5rem', textAlign: 'center', color: place === 1 ? 'var(--orange)' : 'var(--muted)', flexShrink: 0 }}>
                    {place}
                  </span>
                  <Avatar name={row.display_name} url={row.avatar_url} />
                  <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.display_name}
                    {row.is_me && <span style={{ color: 'var(--orange)', fontSize: '0.6875rem', marginLeft: '0.4rem' }}>{t('community.you')}</span>}
                  </span>
                  {rank && (
                    <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: rank.color, border: `1px solid ${rank.color}`, borderRadius: 12, padding: '0.1rem 0.4rem', flexShrink: 0 }}>
                      {rankDisplay(rank, i18n.language)}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.875rem', color: i === 0 ? 'var(--orange)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {t('community.stat_minutes', { count: row.minutes })}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
