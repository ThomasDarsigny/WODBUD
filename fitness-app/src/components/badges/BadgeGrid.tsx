import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import {
  BADGE_FAMILY_I18N_KEYS,
  badgeCondition,
  badgeDisplay,
  fetchBadgeCatalogue,
  fetchUnlockedBadges,
  groupByFamily,
  recalcBadges,
  type Badge
} from '../../lib/badges'
import BadgeToken, { type BadgeState } from './BadgeToken'
import EmptyState from '../ui/EmptyState'
import Skeleton from '../ui/Skeleton'
import { label, text } from '../../styles/ui'

/**
 * Collection de badges.
 *
 * On affiche TOUT le catalogue, verrouillé compris : une collection dont on ne
 * voit que les cases remplies ne donne envie de rien. Ce sont les cases vides
 * qui indiquent quoi viser — d'où la condition écrite sous chaque badge, même
 * non obtenu.
 */
export default function BadgeGrid() {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language

  const [catalogue, setCatalogue] = useState<Badge[]>([])
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map())
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const userId = auth.user?.id
        if (!userId) return

        // Réévaluer d'abord : sans ça, un badge mérité depuis la dernière
        // visite ne s'afficherait qu'au chargement suivant.
        let newly: string[] = []
        try {
          newly = await recalcBadges()
        } catch {
          // Le recalcul est un confort. Une panne ici ne doit pas vider la page.
        }

        const [cat, mine] = await Promise.all([
          fetchBadgeCatalogue(),
          fetchUnlockedBadges(userId)
        ])
        if (cancelled) return

        setCatalogue(cat)
        setUnlocked(new Map(mine.map((b) => [b.badge_key, b.unlocked_at])))
        setFresh(new Set(newly))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo(() => groupByFamily(catalogue), [catalogue])
  const earned = useMemo(
    () => catalogue.filter((b) => unlocked.has(b.key)).length,
    [catalogue, unlocked]
  )
  const total = useMemo(() => catalogue.filter((b) => b.available).length, [catalogue])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        <Skeleton height={18} width="40%" />
        <Skeleton height={92} lines={3} />
      </div>
    )
  }

  if (catalogue.length === 0) {
    return <EmptyState compact icon="rank" title={t('badges.empty')} hint={t('badges.empty_hint')} />
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--s3)',
          marginBottom: 'var(--s5)',
          flexWrap: 'wrap'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: text.h2,
            fontWeight: 900,
            color: 'var(--orange)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {earned} / {total}
        </span>
        <span style={{ ...label, display: 'inline' }}>{t('badges.unlocked_count')}</span>
      </div>

      {fresh.size > 0 && (
        <p
          role="status"
          style={{
            border: '1px solid rgba(255, 90, 31, 0.35)',
            background: 'rgba(255, 90, 31, 0.08)',
            padding: 'var(--s3) var(--s4)',
            marginBottom: 'var(--s5)',
            fontSize: text.body
          }}
        >
          {t('badges.newly_unlocked', { count: fresh.size })}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.family} style={{ marginBottom: 'var(--s6)' }}>
          <h3 style={{ ...label, marginBottom: 'var(--s3)' }}>
            {t(BADGE_FAMILY_I18N_KEYS[g.family])}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 'var(--s4)'
            }}
          >
            {g.badges.map((b) => {
              const at = unlocked.get(b.key)
              const state: BadgeState = at ? 'unlocked' : b.available ? 'locked' : 'soon'
              const isNew = fresh.has(b.key)
              return (
                <div
                  key={b.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 'var(--s2)',
                    padding: 'var(--s3)',
                    border: `1px solid ${isNew ? 'var(--orange)' : 'transparent'}`
                  }}
                >
                  <BadgeToken
                    icon={b.icon}
                    state={state}
                    size={72}
                    title={badgeDisplay(b, lang)}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-d)',
                      fontSize: text.sm,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                      color: at ? 'var(--white)' : 'var(--muted)'
                    }}
                  >
                    {badgeDisplay(b, lang)}
                  </span>
                  <span
                    style={{
                      fontSize: text.sm,
                      color: 'var(--muted)',
                      lineHeight: 1.4
                    }}
                  >
                    {badgeCondition(b, lang)}
                  </span>
                  {state === 'soon' && (
                    <span style={{ ...label, color: 'var(--line-fn)' }}>{t('badges.soon')}</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
