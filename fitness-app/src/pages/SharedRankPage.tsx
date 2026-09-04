import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatMinutes, rankMotto, type Rank } from '../lib/ranks'
import RankBadge from '../components/rank/RankBadge'

interface SharedRank {
  display_name: string
  rank_key: string
  total_minutes: number
  current_streak: number
}

/**
 * Page publique d'un rang partagé — accessible sans compte.
 *
 * Elle passe par la fonction `get_shared_rank`, qui ne retourne que quatre
 * champs. Aucune policy large n'est ouverte sur `profiles` : un lien de partage
 * expose un rang, pas un profil.
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
        const row = (data ?? [])[0] as SharedRank | undefined
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--white)', fontFamily: 'var(--font-b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--page-pad)' }}>
      <Link to="/" style={{ fontFamily: 'var(--font-d)', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--white)', textDecoration: 'none', marginBottom: '2.5rem' }}>
        WOD<span style={{ color: 'var(--orange)' }}>BUD</span>
      </Link>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-d)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {t('rank.loading')}
        </p>
      ) : !shared || !rank ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', textAlign: 'center' }}>
          {t('rank.shared_not_found')}
        </p>
      ) : (
        <div style={{ border: `1px solid ${rank.color}`, background: `${rank.color}0f`, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.68rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 1.25rem' }}>
            {t('rank.shared_title')}
          </p>

          <p style={{ fontFamily: 'var(--font-d)', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
            {shared.display_name || t('rank.anonymous')}
          </p>

          <RankBadge rank={rank} lang={lang} size={150} />

          {rankMotto(rank, lang) && (
            <p style={{ fontStyle: 'italic', color: 'var(--muted)', margin: '1rem 0 0', fontSize: '0.95rem' }}>
              « {rankMotto(rank, lang)} »
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.75rem' }}>
            <PublicStat value={formatMinutes(shared.total_minutes)} label={t('rank.total_minutes')} />
            <PublicStat value={t('rank.days', { count: shared.current_streak })} label={t('rank.current_streak')} />
          </div>

          <Link
            to="/"
            style={{
              display: 'inline-block', marginTop: '2rem', textDecoration: 'none',
              fontFamily: 'var(--font-d)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--black)', background: 'var(--orange)',
              padding: '0.7rem 1.4rem'
            }}
          >
            {t('rank.shared_cta')}
          </Link>

        </div>
      )}
    </div>
  )
}

function PublicStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ border: '1px solid var(--border)', padding: '0.55rem 0.9rem', minWidth: 100 }}>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.1rem', fontWeight: 900, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-d)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.15rem' }}>{label}</div>
    </div>
  )
}
