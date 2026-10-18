import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMemberProfile, type MemberProfile } from '../../lib/communitySocial'
import { badgeDisplay, fetchBadgesByKeys, type Badge } from '../../lib/badges'
import { computeProgress, rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import BadgeToken from '../badges/BadgeToken'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice, SectionLabel } from './communityUi'

/** Profil d'un membre, vu depuis une communauté : rang et badges s'il les partage. */
export default function MemberProfileModal({ communityId, userId, onClose }: {
  communityId: string
  userId: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('common')
  const { ranks, fetchAll } = useRankStore()
  const [profile, setProfile] = useState<MemberProfile | null | undefined>(undefined)
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchAll() }, [fetchAll])

  useEffect(() => {
    let mounted = true
    fetchMemberProfile(communityId, userId)
      .then(async (p) => {
        if (!mounted) return
        setProfile(p)
        if (p?.visible && p.badges.length) {
          const list = await fetchBadgesByKeys(p.badges.map((b) => b.key))
          if (mounted) setBadges(list)
        }
      })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [communityId, userId, t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rank = profile?.rank_key ? ranks.find((r) => r.key === profile.rank_key) : undefined
  const progress = profile?.visible && ranks.length ? computeProgress(ranks, profile.total_minutes ?? 0) : null
  // Ordre de déblocage, le plus récent d'abord.
  const ordered = (profile?.badges ?? [])
    .map((ub) => badges.find((b) => b.key === ub.key))
    .filter((b): b is Badge => !!b)

  return (
    <div role='dialog' aria-modal='true' aria-label={profile?.display_name ?? ''} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--black)', border: '1px solid var(--border)', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} aria-label={t('actions.close')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {error && <Notice tone='error'>{error}</Notice>}
        {profile === undefined && !error && <Skeleton height={160} />}
        {profile === null && <Notice>{t('community.profile_not_found')}</Notice>}

        {profile && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={64} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0, overflowWrap: 'anywhere' }}>
                  {profile.display_name}
                </h2>
                {(profile.is_owner || profile.role === 'admin') && (
                  <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                    {profile.is_owner ? t('community.role_owner') : t('community.role_admin')}
                  </span>
                )}
              </div>
            </div>

            {!profile.visible ? (
              <Notice>{t('community.profile_private')}</Notice>
            ) : (
              <>
                {rank && (
                  <div style={{ border: `1px solid ${rank.color}`, background: `${rank.color}14`, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>{t('community.profile_rank')}</p>
                    <p style={{ margin: '0.15rem 0 0', fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: rank.color }}>{rankDisplay(rank, i18n.language)}</p>
                    {progress?.next && (
                      <>
                        <div style={{ height: 6, background: 'var(--black)', border: '1px solid var(--border)', margin: '0.6rem 0 0.3rem', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(progress.ratio * 100)}%`, background: rank.color }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {t('community.profile_next', { count: progress.remaining, rank: rankDisplay(progress.next, i18n.language) })}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Stat value={profile.total_minutes ?? 0} label={t('community.profile_minutes')} />
                  <Stat value={profile.current_streak ?? 0} label={t('community.profile_streak')} />
                  <Stat value={profile.longest_streak ?? 0} label={t('community.profile_best_streak')} />
                </div>

                <SectionLabel>{t('community.profile_badges', { count: profile.badges.length })}</SectionLabel>
                {ordered.length === 0 ? (
                  <Notice>{t('community.profile_no_badges')}</Notice>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '0.9rem', marginBottom: '1rem' }}>
                    {ordered.map((b) => (
                      <div key={b.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', textAlign: 'center' }}>
                        <BadgeToken icon={b.icon} state='unlocked' size={52} title={badgeDisplay(b, i18n.language)} />
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2 }}>
                          {badgeDisplay(b, i18n.language)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {profile.social_links.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {profile.social_links.map((l) => (
                      <a key={l.url} href={l.url} target='_blank' rel='noopener noreferrer nofollow' style={{ color: 'var(--orange)', fontSize: '0.8125rem' }}>
                        {l.platform}
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--dark)', padding: '0.6rem', textAlign: 'center' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-d)', fontSize: '1.375rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
    </div>
  )
}
