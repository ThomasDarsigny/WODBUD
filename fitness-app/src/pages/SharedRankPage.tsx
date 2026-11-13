import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatMinutes, rankMotto, type Rank } from '../lib/ranks'
import RankBadge from '../components/rank/RankBadge'
import { usePageMeta } from '../hooks/usePageMeta'
import type { SocialLink } from '../types'

interface SharedRank {
  display_name: string
  rank_key: string
  total_minutes: number
  current_streak: number
  avatar_url: string | null
  social_links: SocialLink[]
}

const SOCIAL_LABEL: Record<SocialLink['platform'], string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  autre: ''
}

/**
 * Page publique d'un rang partagé — accessible sans compte.
 *
 * Elle passe par la fonction `get_shared_rank`, qui ne retourne que les
 * champs choisis (nom, rang, photo, réseaux sociaux). Aucune policy large
 * n'est ouverte sur `profiles` : un lien de partage expose un rang et ce que
 * la personne a choisi d'y ajouter, pas le reste de son profil.
 */
export default function SharedRankPage() {
  const { token } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation('common')
  const [shared, setShared] = useState<SharedRank | null>(null)
  const [rank, setRank] = useState<Rank | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!token) { setLoading(false); return }
      try {
        const { data, error } = await supabase.rpc('get_shared_rank', { p_token: token })
        if (error) throw error
        const row = (data ?? [])[0] as unknown as SharedRank | undefined
        if (!mounted) return
        if (!row) { setLoading(false); return }
        setShared(row)

        const { data: ranks } = await supabase.from('ranks').select('*')
        if (!mounted) return
        setRank(((ranks ?? []) as Rank[]).find((r) => r.key === row.rank_key) ?? null)
      } catch {
        /* lien invalide ou révoqué : on tombe sur l'état « non trouvé » */
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [token])

  const lang = i18n.language
  const name = shared?.display_name || t('rank.anonymous')
  usePageMeta(shared ? `${name} · ${t('rank.shared_title')} | WODBUD` : `${t('rank.shared_title')} | WODBUD`)

  return (
    <main className="wb-share-page">
      <Link to="/" className="wb-share-logo">
        WOD<span>BUD</span>
      </Link>

      {loading ? (
        <p className="wb-share-loading" role="status">{t('rank.loading')}</p>
      ) : !shared || !rank ? (
        <p className="wb-share-missing">{t('rank.shared_not_found')}</p>
      ) : (
        <article className="wb-share-card" style={{ '--rank': rank.color } as CSSProperties}>
          <p className="wb-share-tag">{t('rank.shared_title')}</p>

          {shared.avatar_url && <img src={shared.avatar_url} alt="" className="wb-share-avatar" />}

          <h1 className="wb-share-name">{name}</h1>

          <RankBadge rank={rank} lang={lang} size={150} />

          {rankMotto(rank, lang) && <p className="wb-share-motto">« {rankMotto(rank, lang)} »</p>}

          <div className="wb-share-stats">
            <PublicStat value={formatMinutes(shared.total_minutes)} label={t('rank.total_minutes')} />
            <PublicStat value={t('rank.days', { count: shared.current_streak })} label={t('rank.current_streak')} />
          </div>

          {shared.social_links?.length > 0 && (
            <div className="wb-share-links">
              {shared.social_links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="wb-share-link">
                  {SOCIAL_LABEL[link.platform] || link.platform}
                </a>
              ))}
            </div>
          )}

          <Link to="/" className="wb-btn wb-btn--primary wb-share-cta">{t('rank.shared_cta')}</Link>
        </article>
      )}
    </main>
  )
}

function PublicStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="wb-share-stat">
      <div className="wb-share-stat-value">{value}</div>
      <div className="wb-share-stat-label">{label}</div>
    </div>
  )
}
