import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CommunityMember } from '../../lib/communityMembers'
import { removeMember, setMemberRole } from '../../lib/communitySocial'
import { rankDisplay } from '../../lib/ranks'
import { useRankStore } from '../../stores/rankStore'
import ConfirmButton from '../ui/ConfirmButton'
import { btnDanger, btnSmall } from '../../styles/ui'
import { Avatar, Notice } from './communityUi'

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
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {members.map((m) => {
          const rank = m.share_rank && m.rank_key ? ranks.find((r) => r.key === m.rank_key) : undefined
          const canModerate = isAdmin && !m.is_me && !m.is_owner
          return (
            <li key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--dark)', padding: '0.5rem 0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => onOpenMember(m.user_id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 200px', minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--white)', textAlign: 'left' }}>
                <Avatar name={m.display_name} url={m.avatar_url} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-d)', fontSize: '0.9375rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.display_name}
                    {m.is_me && <span style={{ color: 'var(--orange)', fontSize: '0.6875rem', marginLeft: '0.4rem' }}>{t('community.you')}</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {m.is_owner ? t('community.role_owner') : m.role === 'admin' ? t('community.role_admin') : t('community.role_member')}
                    {isMember && !m.share_rank && ` · ${t('community.rank_private')}`}
                  </span>
                </span>
              </button>
              {rank && (
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: rank.color, border: `1px solid ${rank.color}`, borderRadius: 12, padding: '0.1rem 0.4rem' }}>
                  {rankDisplay(rank, i18n.language)}
                </span>
              )}
              {canModerate && (
                <span style={{ display: 'flex', gap: '0.35rem' }}>
                  {isOwner && (
                    <button
                      onClick={() => { void run(m.user_id, () => setMemberRole(communityId, m.user_id, m.role === 'admin' ? 'member' : 'admin')) }}
                      disabled={busy === m.user_id}
                      style={btnSmall}
                    >
                      {m.role === 'admin' ? t('community.demote') : t('community.promote')}
                    </button>
                  )}
                  <ConfirmButton
                    onConfirm={() => run(m.user_id, () => removeMember(communityId, m.user_id))}
                    confirmLabel={t('actions.confirm')}
                    style={{ ...btnDanger, minHeight: 36, fontSize: '0.6875rem', padding: '0 0.6rem' }}
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
