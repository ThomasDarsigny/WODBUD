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
import { btnPrimary } from '../../styles/ui'
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
    <div className="wb-page" style={{ maxWidth: 820 }}>
      <Link to={`${basePath}/communities`} className="wb-rec-back" style={{ marginBottom: '-0.5rem' }}>
        ‹ {t('community.back')}
      </Link>

      <header className="wb-card wb-card--accent wb-commu-hero">
        <p className="wb-ph-tag">
          {t('community.member_count', { count: members?.length ?? community.member_count ?? 0 })}
          {isOwner ? ` · ${t('community.role_owner')}` : isAdmin ? ` · ${t('community.role_admin')}` : ''}
        </p>
        <h1 className="wb-ph-h1">
          {community.name}
        </h1>
        {community.description && <p className="wb-cardio-hint">{community.description}</p>}

        <div className="wb-commu-actions">
          {!isOwner && (
            <button type="button" className={`wb-btn ${isMember ? 'wb-btn--secondary' : 'wb-btn--primary'}`} onClick={() => { void toggleMembership() }} disabled={busy}>
              {isMember ? t('community.leave') : t('community.join')}
            </button>
          )}
          {isMember && (
            <button type="button" className={`wb-btn wb-btn--secondary${sharing ? ' is-on' : ''}`} onClick={() => { void toggleShare() }} disabled={busy || !me} aria-pressed={sharing}>
              {sharing ? `✓ ${t('community.rank_shared')}` : t('community.share_rank')}
            </button>
          )}
          <button type="button" className="wb-btn wb-btn--secondary" onClick={() => { void copyInvite() }}>
            {copied ? `✓ ${t('community.invite_copied')}` : t('community.invite')}
          </button>
        </div>
        {isMember && !sharing && <p className="wb-set-hint">{t('community.share_rank_hint')}</p>}
      </header>

      {error && <Notice tone='error'>{error}</Notice>}

      <div role='tablist' className='wb-chips' aria-label={community.name}>
        {TABS.map((k) => (
          <button key={k} type='button' role='tab' aria-selected={tab === k} className={`wb-chip${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>
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
