import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLocalUser } from '../../lib/currentUser'
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
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: auth } = await getLocalUser()
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

  const shown = groups
    .map((g) => ({
      ...g,
      badges: g.badges.filter((b) => filter === 'all' || (filter === 'earned' ? unlocked.has(b.key) : !unlocked.has(b.key)))
    }))
    .filter((g) => g.badges.length > 0)

  return (
    <div className="wb-badges">
      <div className="wb-badges-head">
        <strong>{earned}<small>/{total}</small></strong>
        <span>{t('badges.unlocked_count')}</span>
      </div>

      {fresh.size > 0 && (
        <p role="status" className="wb-badges-fresh">{t('badges.newly_unlocked', { count: fresh.size })}</p>
      )}

      <div className="wb-segmented wb-badges-filter" role="tablist" aria-label={t('badges.title')}>
        {(['all', 'earned', 'locked'] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : undefined} onClick={() => setFilter(f)}>
            {t(`badges.filter_${f}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="wb-muted-line">{t('badges.filter_none')}</p>}

      {shown.map((g) => (
        <section key={g.family} className="wb-badges-family">
          <h3>{t(BADGE_FAMILY_I18N_KEYS[g.family])}</h3>
          <div className="wb-badges-grid">
            {g.badges.map((b) => {
              const at = unlocked.get(b.key)
              const state: BadgeState = at ? 'unlocked' : b.available ? 'locked' : 'soon'
              const isNew = fresh.has(b.key)
              return (
                <div key={b.key} className={`wb-badge${at ? ' is-earned' : ''}${isNew ? ' is-new' : ''}`} data-rarity={b.rarity ?? undefined}>
                  <BadgeToken icon={b.icon} art={b.art} fresh={isNew} state={state} size={64} title={`${badgeDisplay(b, lang)}${b.rarity ? ` · ${t(`badges.rarity.${b.rarity}`)}` : ''}`} />
                  <strong>{badgeDisplay(b, lang)}</strong>
                  <span>{state === 'soon' ? t('badges.soon') : badgeCondition(b, lang)}</span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
