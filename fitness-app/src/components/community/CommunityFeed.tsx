import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchFeed, REACTIONS, toggleReaction, type FeedEvent, type ReactionEmoji } from '../../lib/communitySocial'
import { badgeDisplay, fetchBadgesByKeys, type Badge } from '../../lib/badges'
import { rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice, useTimeAgo } from './communityUi'

/** Séances, badges et rangs des membres qui partagent, 30 derniers jours. */
export default function CommunityFeed({ communityId, onOpenMember }: {
  communityId: string
  onOpenMember: (userId: string) => void
}) {
  const { t, i18n } = useTranslation('common')
  const timeAgo = useTimeAgo()
  const { ranks, fetchAll } = useRankStore()
  const [events, setEvents] = useState<FeedEvent[] | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    let mounted = true
    fetchFeed(communityId)
      .then(async (rows) => {
        if (!mounted) return
        setEvents(rows)
        const keys = Array.from(new Set(rows.map((r) => r.badge_key).filter((k): k is string => !!k)))
        if (keys.length) {
          const list = await fetchBadgesByKeys(keys)
          if (mounted) setBadges(list)
        }
      })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [communityId, t])

  // Mise à jour optimiste : la réaction s'affiche tout de suite, et revient
  // en arrière si l'écriture échoue.
  async function react(ev: FeedEvent, emoji: ReactionEmoji) {
    const on = !ev.my_reactions.includes(emoji)
    const patch = (e: FeedEvent, sign: 1 | -1, add: boolean): FeedEvent => ({
      ...e,
      [emoji]: e[emoji] + sign,
      my_reactions: add ? [...e.my_reactions, emoji] : e.my_reactions.filter((x) => x !== emoji)
    })
    setEvents((list) => list?.map((e) => (e.event_key === ev.event_key ? patch(e, on ? 1 : -1, on) : e)) ?? null)
    try {
      await toggleReaction(communityId, ev.event_key, emoji, on)
    } catch (err) {
      setEvents((list) => list?.map((e) => (e.event_key === ev.event_key ? patch(e, on ? -1 : 1, !on) : e)) ?? null)
      setError(err instanceof Error ? err.message : t('errors.generic'))
    }
  }

  function describe(ev: FeedEvent): string {
    if (ev.kind === 'session') {
      return ev.title
        ? t('community.feed_session', { title: ev.title, count: ev.minutes ?? 0 })
        : t('community.feed_session_free', { count: ev.minutes ?? 0 })
    }
    if (ev.kind === 'rank') {
      const rank = ranks.find((r) => r.key === ev.rank_key)
      return t('community.feed_rank', { rank: rank ? rankDisplay(rank, i18n.language) : ev.rank_key })
    }
    const badge = badges.find((b) => b.key === ev.badge_key)
    return t('community.feed_badge', { badge: badge ? badgeDisplay(badge, i18n.language) : ev.badge_key })
  }

  if (error && !events) return <Notice tone='error'>{error}</Notice>
  if (!events) return <Skeleton height={64} lines={3} />
  if (events.length === 0) return <Notice>{t('community.feed_empty')}</Notice>

  return (
    <>
      {error && <Notice tone='error'>{error}</Notice>}
      <ul className='wb-list wb-stagger'>
        {events.map((ev) => (
          <li key={ev.event_key} className='wb-feed-item'>
            <button type='button' onClick={() => onOpenMember(ev.user_id)} aria-label={ev.display_name} className='wb-feed-avatar-btn'>
              <Avatar name={ev.display_name} url={ev.avatar_url} size={40} />
            </button>
            <div className='wb-feed-main'>
              <p className='wb-feed-text'>
                <button type='button' onClick={() => onOpenMember(ev.user_id)} className='wb-feed-name'>
                  {ev.display_name}
                </button>{' '}
                <span className='wb-feed-desc'>{describe(ev)}</span>
              </p>
              <div className='wb-feed-meta'>
                <span className='wb-feed-time'>{timeAgo(ev.at)}</span>
                {REACTIONS.map(({ key, glyph }) => {
                  const mine = ev.my_reactions.includes(key)
                  const count = ev[key]
                  return (
                    <button
                      key={key}
                      type='button'
                      onClick={() => { void react(ev, key) }}
                      aria-pressed={mine}
                      aria-label={t(`community.react_${key}`)}
                      className='wb-react'
                    >
                      {glyph}{count > 0 ? ` ${count}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
