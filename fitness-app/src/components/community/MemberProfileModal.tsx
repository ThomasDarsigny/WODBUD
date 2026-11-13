import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMemberProfile, type MemberProfile } from '../../lib/communitySocial'
import { badgeDisplay, fetchBadgesByKeys, type Badge } from '../../lib/badges'
import { computeProgress, rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import BadgeToken from '../badges/BadgeToken'
import Skeleton from '../ui/Skeleton'
import { Avatar, Notice, SectionLabel } from './communityUi'
import { useDialog } from '../../hooks/useDialog'

/** Profil d'un membre, vu depuis une communauté : rang et badges s'il les partage. */
export default function MemberProfileModal({ communityId, userId, onClose }: {
  communityId: string
  userId: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('common')
  // Fenêtre partagée (4.2) : Échap, retour Android, focus rendu à la fermeture.
  const boxRef = useRef<HTMLDivElement>(null)
  useDialog(boxRef, onClose)
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

  const rank = profile?.rank_key ? ranks.find((r) => r.key === profile.rank_key) : undefined
  const progress = profile?.visible && ranks.length ? computeProgress(ranks, profile.total_minutes ?? 0) : null
  // Ordre de déblocage, le plus récent d'abord.
  const ordered = (profile?.badges ?? [])
    .map((ub) => badges.find((b) => b.key === ub.key))
    .filter((b): b is Badge => !!b)

  return (
    <div className='wb-modal-overlay wb-profile-overlay' onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className='wb-profile' role='dialog' aria-modal='true' aria-label={profile?.display_name ?? t('status.loading')} tabIndex={-1}>
        <div className='wb-profile-close-row'>
          <button type='button' onClick={onClose} aria-label={t('actions.close')} className='wb-alert-close'>✕</button>
        </div>

        {error && <Notice tone='error'>{error}</Notice>}
        {profile === undefined && !error && <Skeleton height={160} />}
        {profile === null && <Notice>{t('community.profile_not_found')}</Notice>}

        {profile && (
          <>
            <div className='wb-profile-head'>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={64} />
              <div className='wb-commu-min'>
                <h2 className='wb-profile-name'>{profile.display_name}</h2>
                {(profile.is_owner || profile.role === 'admin') && (
                  <span className='wb-profile-role'>{profile.is_owner ? t('community.role_owner') : t('community.role_admin')}</span>
                )}
              </div>
            </div>

            {!profile.visible ? (
              <Notice>{t('community.profile_private')}</Notice>
            ) : (
              <>
                {rank && (
                  <div className='wb-profile-rank' style={{ '--rank': rank.color } as CSSProperties}>
                    <p className='wb-profile-rank-label'>{t('community.profile_rank')}</p>
                    <p className='wb-profile-rank-name'>{rankDisplay(rank, i18n.language)}</p>
                    {progress?.next && (
                      <>
                        <div className='wb-progress wb-progress--thin' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.ratio * 100)} aria-label={t('community.profile_rank')}>
                          <div className='wb-progress-fill wb-progress-fill--rank' style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                        </div>
                        <p className='wb-commu-meta'>
                          {t('community.profile_next', { count: progress.remaining, rank: rankDisplay(progress.next, i18n.language) })}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className='wb-profile-stats'>
                  <Stat value={profile.total_minutes ?? 0} label={t('community.profile_minutes')} />
                  <Stat value={profile.current_streak ?? 0} label={t('community.profile_streak')} />
                  <Stat value={profile.longest_streak ?? 0} label={t('community.profile_best_streak')} />
                </div>

                <SectionLabel>{t('community.profile_badges', { count: profile.badges.length })}</SectionLabel>
                {ordered.length === 0 ? (
                  <Notice>{t('community.profile_no_badges')}</Notice>
                ) : (
                  <div className='wb-profile-badges'>
                    {ordered.map((b) => (
                      <div key={b.key} className='wb-profile-badge'>
                        <BadgeToken icon={b.icon} art={b.art} state='unlocked' size={56} title={badgeDisplay(b, i18n.language)} />
                        <span className='wb-profile-badge-name'>{badgeDisplay(b, i18n.language)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {profile.social_links.length > 0 && (
                  <div className='wb-profile-links'>
                    {profile.social_links.map((l) => (
                      <a key={l.url} href={l.url} target='_blank' rel='noopener noreferrer nofollow' className='wb-profile-link'>
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
    <div className='wb-profile-stat'>
      <p className='wb-profile-stat-value'>{value}</p>
      <p className='wb-profile-stat-label'>{label}</p>
    </div>
  )
}
