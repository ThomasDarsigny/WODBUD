import NavIcon, { type NavIconName } from '../navigation/NavIcon'

/**
 * Jeton de badge — carré à deux coins coupés.
 *
 * La forme évite volontairement l'hexagone, réservé aux rangs : « niveau
 * atteint » et « exploit débloqué » ne doivent pas se confondre au coup d'œil.
 *
 * Le contour est obtenu par imbrication plutôt que par `border` : `clip-path`
 * rogne aussi la bordure, et les arêtes diagonales se retrouveraient sans
 * trait. Deux couches découpées, la seconde en retrait de 2 px, donnent un
 * contour net sur les six côtés.
 */

export type BadgeState = 'unlocked' | 'locked' | 'soon'

const CLIP =
  'polygon(0 0, calc(100% - 22%) 0, 100% 22%, 100% 100%, 22% 100%, 0 calc(100% - 22%))'

interface Props {
  icon: string
  state: BadgeState
  size?: number
  title?: string
}

/** Le catalogue est en base : une icône inconnue ne doit pas casser le rendu. */
function toIconName(icon: string): NavIconName {
  const known: NavIconName[] = [
    'home', 'admin', 'exercises', 'workout', 'library', 'session', 'rank',
    'classes', 'ai', 'vote', 'settings', 'search', 'calendar', 'video',
    'play', 'flame', 'bolt', 'grid', 'star', 'clock'
  ]
  return (known as string[]).includes(icon) ? (icon as NavIconName) : 'rank'
}

export default function BadgeToken({ icon, state, size = 72, title }: Props) {
  const unlocked = state === 'unlocked'
  const soon = state === 'soon'

  const edge = unlocked ? 'var(--orange)' : soon ? 'var(--line-fn)' : 'var(--border)'
  const fill = unlocked ? 'rgba(255, 90, 31, 0.1)' : 'var(--dark)'
  const ink = unlocked ? 'var(--orange)' : soon ? 'var(--muted)' : 'var(--line-fn)'

  return (
    <div
      role="img"
      aria-label={title}
      title={title}
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        clipPath: CLIP,
        background: edge,
        // Un badge verrouillé ne doit pas attirer l'œil autant qu'un obtenu.
        opacity: unlocked ? 1 : 0.85
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 2,
          clipPath: CLIP,
          background: fill,
          display: 'grid',
          placeItems: 'center',
          color: ink
        }}
      >
        <NavIcon name={toIconName(icon)} size={Math.round(size * 0.36)} strokeWidth={1.7} />
      </div>
    </div>
  )
}
