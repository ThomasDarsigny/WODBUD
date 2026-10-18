import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCommunityStore } from '../../stores/communityStore'
import { useRankStore } from '../../stores/rankStore'
import { fetchCommunityMembers, setShareRank, type CommunityMember } from '../../lib/communityMembers'
import { inviteLink } from '../../lib/communitySocial'
import { getLocalUser } from '../../lib/currentUser'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { btnPrimary, btnSecondary } from '../../styles/ui'
import CommunityFeed from './CommunityFeed'
import CommunityChallenges from './CommunityChallenges'
import CommunityLeaderboard from './CommunityLeaderboard'
import CommunityWod from './CommunityWod'
import CommunityMembers from './CommunityMembers'
import MemberProfileModal from './MemberProfileModal'
import { Notice } from './communityUi'

type Tab = 'feed' | 'challenges' | 'leaderboard' | 'wod' | 'members'
const TABS: Tab[] = ['feed', 'challenges', 'leaderboard', 'wod', 'members']

/** Page d'une communauté — coach et athlète, comme la liste. */
export default function CommunityPage() {
  const { t } = useTranslation('common')
  const { id = '' } = useParams<{ id: string }>()
  const basePath = useLocation().pathname.startsWith('/athlete') ? '/athlete' : '/dashboard'
  const { communities, fetchCommunities, joinCommunity, leaveCommunity } = useCommunityStore()
  const fetchRanks = useRankStore((s) => s.fetchAll)
  const community = communities.find((c) => c.id === id)

  const [loaded, setLoaded] = useState(false)
  const [members, setMembers] = useState<CommunityMember[] | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')
  const [openMember, setOpenMember] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchCommunities().finally(() => { if (mounted) setLoaded(true) })
    getLocalUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null) }).catch(() => {})
    void fetchRanks()
    return () => { mounted = false }
  }, [fetchCommunities, fetchRanks])

  const reloadMembers = useCallback(async () => {
    try { setMembers(await fetchCommunityMembers(id)) } catch (err) { setError(err instanceof Error ? err.message : t('errors.generic')) }
  }, [id, t])

  // Recharge la liste quand l'adhésion change.
  useEffect(() => {
    let mounted = true
    fetchCommunityMembers(id)
      .then((rows) => { if (mounted) setMembers(rows) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : t('errors.generic')) })
    return () => { mounted = false }
  }, [id, community?.is_member, t])

  if (!community) {
    if (!loaded) return <div style={{ padding: 'var(--page-pad)' }}><Skeleton height={120} lines={3} /></div>
    return (
      <div style={{ padding: 'var(--page-pad)' }}>
        <EmptyState icon='community' title={t('community.not_found')} action={<Link to={`${basePath}/communities`} style={btnPrimary}>{t('community.back')}</Link>} />
      </div>
    )
  }

  const me = members?.find((m) => m.is_me)
  const isMember = community.is_member ?? false
  const isOwner = community.created_by === userId
  const isAdmin = isOwner || me?.role === 'admin'
  const sharing = me?.share_rank ?? false

  async function toggleMembership() {
    if (!community) return
    setBusy(true)
    setError(null)
    try {
      if (community.is_member) await leaveCommunity(community.id)
      else await joinCommunity(community.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleShare() {
    setBusy(true)
    setError(null)
    try {
      await setShareRank(id, !sharing)
      await reloadMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  async function copyInvite() {
    const url = inviteLink(id)
    try {
      if (navigator.share) {
        await navigator.share({ title: community?.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
  }

  return (
    <div style={{ padding: 'var(--page-pad)', maxWidth: 820 }}>
      <Link to={`${basePath}/communities`} style={{ color: 'var(--muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>
        ← {t('community.back')}
      </Link>

      <header style={{ margin: '0.75rem 0 1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 0.35rem' }}>
          {t('community.member_count', { count: members?.length ?? community.member_count ?? 0 })}
          {isOwner ? ` · ${t('community.role_owner')}` : isAdmin ? ` · ${t('community.role_admin')}` : ''}
        </p>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.05, margin: 0, overflowWrap: 'anywhere' }}>
          {community.name}
        </h1>
        {community.description && <p style={{ color: 'var(--muted)', margin: '0.5rem 0 0', lineHeight: 1.5 }}>{community.description}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {!isOwner && (
            <button onClick={() => { void toggleMembership() }} disabled={busy} style={{ ...(isMember ? btnSecondary : btnPrimary), opacity: busy ? 0.6 : 1 }}>
              {isMember ? t('community.leave') : t('community.join')}
            </button>
          )}
          {isMember && (
            <button onClick={() => { void toggleShare() }} disabled={busy || !me} aria-pressed={sharing}
              style={{ ...btnSecondary, color: sharing ? 'var(--orange)' : 'var(--white)', borderColor: sharing ? 'var(--orange)' : undefined, opacity: busy ? 0.6 : 1 }}>
              {sharing ? `✓ ${t('community.rank_shared')}` : t('community.share_rank')}
            </button>
          )}
          <button onClick={() => { void copyInvite() }} style={btnSecondary}>
            {copied ? `✓ ${t('community.invite_copied')}` : `🔗 ${t('community.invite')}`}
          </button>
        </div>
        {isMember && !sharing && <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.6rem 0 0', lineHeight: 1.5 }}>{t('community.share_rank_hint')}</p>}
      </header>

      {error && <Notice tone='error'>{error}</Notice>}

      <div role='tablist' style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {TABS.map((k) => (
          <button key={k} role='tab' aria-selected={tab === k} onClick={() => setTab(k)}
            style={{ fontFamily: 'var(--font-d)', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.7rem 0.9rem', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? 'var(--orange)' : 'transparent'}`, color: tab === k ? 'var(--white)' : 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t(`community.tab_${k}`)}
          </button>
        ))}
      </div>

      {tab !== 'members' && !isMember ? (
        <Notice>{t('community.join_to_see')}</Notice>
      ) : tab === 'feed' ? (
        <CommunityFeed communityId={id} onOpenMember={setOpenMember} />
      ) : tab === 'challenges' ? (
        <CommunityChallenges communityId={id} isAdmin={isAdmin} />
      ) : tab === 'leaderboard' ? (
        <CommunityLeaderboard communityId={id} members={members ?? []} onOpenMember={setOpenMember} />
      ) : tab === 'wod' ? (
        <CommunityWod communityId={id} isAdmin={isAdmin} basePath={basePath} />
      ) : members === null ? (
        <Skeleton height={48} lines={3} />
      ) : (
        <CommunityMembers communityId={id} members={members} isMember={isMember} isOwner={isOwner} isAdmin={isAdmin}
          onOpenMember={setOpenMember} onChanged={reloadMembers} />
      )}

      {openMember && <MemberProfileModal communityId={id} userId={openMember} onClose={() => setOpenMember(null)} />}
    </div>
  )
}
