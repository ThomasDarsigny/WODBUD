import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CommunityMember } from '../../lib/communityMembers'
import { removeMember, setMemberRole } from '../../lib/communitySocial'
import { rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import ConfirmButton from '../ui/ConfirmButton'
import { Avatar, Notice } from './communityUi'
import { RankEmblem } from '../rank/RankBadge'

/**
 * Membres, et modération : le propriétaire nomme ou retire des co-admins ;
 * propriétaire et co-admins retirent un membre (jamais le propriétaire).
 */
export default function CommunityMembers({ communityId, members, isMember, isOwner, isAdmin, onOpenMember, onChanged }: {
  communityId: string
  members: CommunityMember[]
  isMember: boolean
  isOwner: boolean
  isAdmin: boolean
  onOpenMember: (userId: string) => void
  onChanged: () => Promise<void>
}) {
  const { t, i18n } = useTranslation('common')
  const ranks = useRankStore((s) => s.ranks)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(userId: string, action: () => Promise<void>) {
    setBusy(userId)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  if (members.length === 0) return <Notice>{t('community.no_members')}</Notice>

  return (
    <div>
      {error && <Notice tone='error'>{error}</Notice>}
      <ul className='wb-list wb-stagger'>
        {members.map((m) => {
          const rank = m.share_rank && m.rank_key ? ranks.find((r) => r.key === m.rank_key) : undefined
          const canModerate = isAdmin && !m.is_me && !m.is_owner
          return (
            <li key={m.user_id} className='wb-member-row'>
              <button type='button' onClick={() => onOpenMember(m.user_id)} className='wb-commu-member-btn'>
                <Avatar name={m.display_name} url={m.avatar_url} />
                <span className='wb-commu-min'>
                  <span className='wb-board-name wb-commu-block'>
                    {m.display_name}
                    {m.is_me && <span className='wb-you'>{t('community.you')}</span>}
                  </span>
                  <span className='wb-commu-meta wb-commu-block'>
                    {m.is_owner ? t('community.role_owner') : m.role === 'admin' ? t('community.role_admin') : t('community.role_member')}
                    {isMember && !m.share_rank && ` · ${t('community.rank_private')}`}
                  </span>
                </span>
              </button>
              {rank && (
                <span className="wb-rank-pill" style={{ '--rank': rank.color } as CSSProperties}>
                  <RankEmblem rank={rank} size={18} />{rankDisplay(rank, i18n.language)}
                </span>
              )}
              {canModerate && (
                <span className='wb-commu-mod'>
                  {isOwner && (
                    <button
                      type='button'
                      onClick={() => { void run(m.user_id, () => setMemberRole(communityId, m.user_id, m.role === 'admin' ? 'member' : 'admin')) }}
                      disabled={busy === m.user_id}
                      className='wb-btn wb-btn--ghost wb-btn--sm'
                    >
                      {m.role === 'admin' ? t('community.demote') : t('community.promote')}
                    </button>
                  )}
                  <ConfirmButton
                    onConfirm={() => run(m.user_id, () => removeMember(communityId, m.user_id))}
                    confirmLabel={t('actions.confirm')}
                    ariaLabel={`${t('community.remove')} — ${m.display_name}`}
                    className='wb-btn wb-btn--danger wb-btn--sm'
                  >
                    {t('community.remove')}
                  </ConfirmButton>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
