import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCommunityLeaderboard, type CommunityLeaderRow, type CommunityPeriod } from '../../lib/communitySocial'
import type { CommunityMember } from '../../lib/communityMembers'
import { rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice } from './communityUi'
import { RankEmblem } from '../rank/RankBadge'

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
      <div role='tablist' className='wb-segmented wb-commu-periods'>
        {(['week', 'month', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            type='button'
            role='tab'
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={period === p ? 'is-on' : undefined}
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
        <ol className='wb-list wb-stagger'>
          {list.map((row, i) => {
            // Ex æquo : même place pour les mêmes minutes.
            const place = list.findIndex((r) => r.minutes === row.minutes) + 1
            const member = members.find((m) => m.user_id === row.user_id)
            const rank = period === 'all' ? ranks.find((r) => r.key === member?.rank_key) : undefined
            return (
              <li key={row.user_id}>
                <button
                  type='button'
                  onClick={() => onOpenMember(row.user_id)}
                  className={`wb-row wb-board-row${row.is_me ? ' is-me' : ''}`}
                >
                  <span className='wb-board-place' data-place={place <= 3 ? place : undefined}>
                    {place}
                  </span>
                  <Avatar name={row.display_name} url={row.avatar_url} />
                  <span className='wb-board-name'>
                    {row.display_name}
                    {row.is_me && <span className='wb-you'>{t('community.you')}</span>}
                  </span>
                  {rank && (
                    <span className='wb-rank-pill' style={{ '--rank': rank.color } as CSSProperties}>
                      <RankEmblem rank={rank} size={18} />{rankDisplay(rank, i18n.language)}
                    </span>
                  )}
                  <span className={`wb-board-min${i === 0 ? ' is-first' : ''}`}>
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
