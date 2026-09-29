import { useId } from 'react'
import { rankDisplay, type Rank } from '../../lib/ranks'

/**
 * Insigne de rang — SVG inline, aucun asset à héberger.
 * L'hexagone prend la couleur du rang venant de la base : ajouter un rang en
 * base suffit, aucun code à toucher.
 *
 * L'éclat, le dégradé et les facettes montent avec `rank.position` (1 à 10) :
 * la progression doit se voir au premier coup d'œil sur l'insigne lui-même,
 * pas seulement se lire dans le numéro. Affiché en grand (140-150px) sur
 * l'écran de rang et sur la page de partage publique — c'est le seul
 * élément que quelqu'un montre à quelqu'un d'autre, il mérite plus qu'un
 * hexagone plat.
 */
export default function RankBadge({ rank, lang, size = 132, dimmed = false }: {
  rank: Rank
  lang: string
  size?: number
  dimmed?: boolean
}) {
  const gradientId = useId()
  const color = dimmed ? 'var(--border)' : rank.color
  const label = rankDisplay(rank, lang)

  const tier = Math.min(Math.max(rank.position, 1), 10)
  const glowBlur = dimmed ? 0 : 2 + tier * 0.8
  const glowOpacity = dimmed ? 0 : 0.22 + tier * 0.035
  // Légende, Immortel, Boss Final : les trois derniers rangs seuls ont droit
  // au sunburst, pour qu'il reste un palier qu'on voit venir de loin plutôt
  // que de s'estomper dans un dégradé continu.
  const isPrestige = !dimmed && tier >= 8

  const OUTER = '50,4 91,27 91,73 50,96 9,73 9,27'
  const INNER = '50,15 81,33 81,67 50,85 19,67 19,33'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={label}
        style={dimmed ? undefined : { filter: `drop-shadow(0 0 ${glowBlur}px ${color}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')})` }}
      >
        <defs>
          <linearGradient id={gradientId} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={dimmed ? 0 : 0.38} />
            <stop offset="100%" stopColor={color} stopOpacity={dimmed ? 0 : 0.07} />
          </linearGradient>
        </defs>

        {isPrestige && (
          <g stroke={color} strokeWidth="1" opacity="0.35">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="50" y1="50" x2="50" y2="2" transform={`rotate(${i * 30} 50 50)`} />
            ))}
          </g>
        )}

        <polygon points={OUTER} fill={`url(#${gradientId})`} stroke={color} strokeWidth="3" />
        <polygon points={INNER} fill="none" stroke={color} strokeWidth="1" opacity={0.45} />

        {/* Facettes : un trait court à chaque sommet, comme une pierre taillée. */}
        {!dimmed && (
          <g stroke={color} strokeWidth="1" opacity="0.5">
            <line x1="50" y1="4" x2="50" y2="11" />
            <line x1="91" y1="27" x2="84.5" y2="30.7" />
            <line x1="91" y1="73" x2="84.5" y2="69.3" />
            <line x1="50" y1="96" x2="50" y2="89" />
            <line x1="9" y1="73" x2="15.5" y2="69.3" />
            <line x1="9" y1="27" x2="15.5" y2="30.7" />
          </g>
        )}

        <text
          x="50" y="58"
          textAnchor="middle"
          fill={color}
          style={{ fontFamily: 'var(--font-d)', fontSize: '30px', fontWeight: 900, letterSpacing: '0.02em' }}
        >
          {rank.position}
        </text>
      </svg>
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
