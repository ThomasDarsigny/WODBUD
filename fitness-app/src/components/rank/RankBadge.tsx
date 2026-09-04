import { rankDisplay, type Rank } from '../../lib/ranks'

/**
 * Insigne de rang — SVG inline, aucun asset à héberger.
 * L'hexagone prend la couleur du rang venant de la base : ajouter un rang en
 * base suffit, aucun code à toucher.
 */
export default function RankBadge({ rank, lang, size = 132, dimmed = false }: {
  rank: Rank
  lang: string
  size?: number
  dimmed?: boolean
}) {
  const color = dimmed ? 'var(--border)' : rank.color
  const label = rankDisplay(rank, lang)

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
        <polygon
          points="50,4 91,27 91,73 50,96 9,73 9,27"
          fill={dimmed ? 'transparent' : `${rank.color}1a`}
          stroke={color}
          strokeWidth="3"
        />
        <polygon
          points="50,15 81,33 81,67 50,85 19,67 19,33"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity={0.45}
        />
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
