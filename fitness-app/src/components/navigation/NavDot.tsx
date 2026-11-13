/**
 * Pastille de notification sur un élément de menu.
 *
 * Volontairement sans compteur au-delà de 9 : au-delà, le nombre exact
 * n'aide plus à décider, il encombre. « 9+ » suffit.
 *
 * Positionnée en absolu sur l'élément parent, qui doit donc porter
 * `position: relative` — c'est déjà le cas des deux barres latérales.
 */
export default function NavDot({ count, compact = false }: {
  /** 0 = rien à signaler, la pastille ne s'affiche pas. */
  count: number
  /** En mode rail (menu réduit), la pastille se colle à l'icône. */
  compact?: boolean
}) {
  if (count <= 0) return null

  return (
    <span aria-hidden="true" className={`wb-navdot${compact ? ' is-compact' : ''}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
