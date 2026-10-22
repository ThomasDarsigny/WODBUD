import { rankDisplay, type Rank } from '../../lib/ranks'

/**
 * Insignes de rang — collection « Forge » (public/ranks/<key>.svg).
 *
 * La progression se lit dans la matière : fer, acier, bronze, argent, or,
 * platine, puis un dernier palier prismatique ; chaque rang porte son propre
 * symbole au lieu d'un numéro. La couleur du rang (en base) teinte l'émail.
 * Un rang ajouté en base sans visuel retombe sur un hexagone à sa couleur.
 */
const ART = new Set(['recrue', 'warmup', 'regulier', 'machine', 'bete', 'monstre', 'bulldozer', 'legende', 'immortel', 'boss_final'])

export function rankArtUrl(rank: Pick<Rank, 'key'>): string | null {
  return ART.has(rank.key) ? `/ranks/${rank.key}.svg` : null
}

/** L'insigne seul, sans libellé : échelle, classements, célébration. */
export function RankEmblem({ rank, size = 40, dimmed = false, lang }: {
  rank: Rank
  size?: number
  dimmed?: boolean
  /** Fournie, elle donne un nom accessible ; sinon l'insigne est décoratif. */
  lang?: string
}) {
  const src = rankArtUrl(rank)
  const a11y = lang ? { role: 'img' as const, 'aria-label': rankDisplay(rank, lang) } : { 'aria-hidden': true as const }
  if (!src) {
    return (
      <span
        {...a11y}
        style={{
          width: size, height: size, flexShrink: 0, display: 'inline-block',
          border: `2px solid ${dimmed ? 'var(--border)' : rank.color}`,
          background: dimmed ? 'transparent' : `${rank.color}33`,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        }}
      />
    )
  }
  return (
    <span {...a11y} className={`wb-rank-emblem${dimmed ? ' is-dimmed' : ''}`} style={{ width: size, height: size }}>
      <img src={src} alt="" width={size} height={size} decoding="async" draggable={false} />
    </span>
  )
}

/** Insigne et nom du rang, en grand : écran de rang et page de partage. */
export default function RankBadge({ rank, lang, size = 132, dimmed = false }: {
  rank: Rank
  lang: string
  size?: number
  dimmed?: boolean
}) {
  const label = rankDisplay(rank, lang)
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <RankEmblem rank={rank} size={size} dimmed={dimmed} lang={lang} />
      <span style={{
        fontFamily: 'var(--font-d)', fontWeight: 900, letterSpacing: '0.1em',
        textTransform: 'uppercase', fontSize: size > 100 ? '1.35rem' : '0.8rem',
        color: dimmed ? 'var(--muted)' : rank.color, textAlign: 'center'
      }}>
        {label}
      </span>
    </div>
  )
}
