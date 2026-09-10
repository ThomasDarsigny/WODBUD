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
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: compact ? 8 : '50%',
        right: compact ? 'calc(50% - 16px)' : '1.25rem',
        transform: compact ? 'none' : 'translateY(-50%)',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--orange)',
        color: 'var(--black)',
        fontFamily: 'var(--font-d)',
        fontSize: '0.625rem',
        fontWeight: 900,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none'
      }}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
