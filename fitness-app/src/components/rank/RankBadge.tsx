import type { CSSProperties } from 'react'
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
        className={`wb-rank-hexa${dimmed ? ' is-dimmed' : ''}`}
        style={{ '--size': `${size}px`, '--rank': rank.color } as CSSProperties}
      />
    )
  }
  return (
    <span {...a11y} className={`wb-rank-emblem${dimmed ? ' is-dimmed' : ''}`} style={{ '--size': `${size}px` } as CSSProperties}>
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
    <div className="wb-rank-badge" style={{ '--rank': rank.color } as CSSProperties}>
      <RankEmblem rank={rank} size={size} dimmed={dimmed} lang={lang} />
      <span className={`wb-rank-badge-name${size > 100 ? '' : ' is-small'}${dimmed ? ' is-dimmed' : ''}`}>{label}</span>
    </div>
  )
}
