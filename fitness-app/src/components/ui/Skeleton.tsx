import type { CSSProperties } from 'react'

/**
 * Placeholder de chargement.
 *
 * Remplace les « Chargement… » textuels. Un mot au milieu d'un écran vide ne
 * dit rien de ce qui arrive ; une forme aux dimensions du contenu à venir
 * évite le saut de mise en page au moment où les données arrivent, et donne
 * une idée de la quantité.
 *
 * L'animation est un balayage lent : sur un fond presque noir, une pulsation
 * d'opacité se voit à peine, alors qu'un reflet qui traverse se lit.
 * Neutralisée si l'utilisateur a demandé moins de mouvement — la règle globale
 * de index.css s'en charge.
 */
interface Props {
  /** Hauteur en px, ou toute valeur CSS. */
  height?: number | string
  width?: number | string
  /** Nombre de barres empilées, pour esquisser une liste. */
  lines?: number
  style?: CSSProperties
}

const bar: CSSProperties = {
  background:
    'linear-gradient(90deg, var(--dark) 0%, var(--surface) 50%, var(--dark) 100%)',
  backgroundSize: '200% 100%',
  animation: 'wodbud-skeleton 1.4s ease-in-out infinite'
}

export default function Skeleton({ height = 16, width = '100%', lines = 1, style }: Props) {
  if (lines > 1) {
    return (
      <div
        aria-hidden="true"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', ...style }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            style={{
              ...bar,
              height,
              // La dernière barre est plus courte : une liste de texte ne
              // finit jamais pile en bout de ligne.
              width: i === lines - 1 ? '62%' : width
            }}
          />
        ))}
      </div>
    )
  }
  return <div aria-hidden="true" style={{ ...bar, height, width, ...style }} />
}

/** Esquisse d'une liste de cartes, aux dimensions réelles de la grille. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--s4)'
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--dark)',
            padding: 'var(--s4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s3)'
          }}
        >
          <Skeleton height={12} width="35%" />
          <Skeleton height={20} width="70%" />
          <Skeleton height={12} lines={2} />
        </div>
      ))}
    </div>
  )
}
