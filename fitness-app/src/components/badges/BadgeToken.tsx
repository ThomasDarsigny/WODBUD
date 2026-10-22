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
  /** Visuel de la collection (public/badges/<art>.svg). Sans lui : pictogramme. */
  art?: string | null
  /** Vient d'être débloqué : reflet qui balaie le badge. */
  fresh?: boolean
}

/**
 * Le catalogue de badges est en base et parle son propre vocabulaire
 * d'icônes (« users », « heart », « dumbbell », « medal »...), pas celui de
 * NavIcon. Sans cette table de correspondance, ces quatre-là retombaient
 * silencieusement sur le fallback 'rank' — `coach_class`, `coach_20`,
 * `cardio_1`, `cardio_20`, `wod_10`, `wod_50`, `wod_100`, `wod_250` et `pr`
 * affichaient tous la même médaille au lieu de leur pictogramme. Les icônes
 * qui existent déjà sous un autre nom sont réutilisées ; une icône
 * réellement inconnue retombe sur 'rank' comme avant.
 */
const ICON_ALIASES: Record<string, NavIconName> = {
  users: 'classes', // NavIcon 'classes' = deux personnes
  heart: 'session', // NavIcon 'session' = cœur
  dumbbell: 'exercises', // NavIcon 'exercises' = haltère
  medal: 'rank' // NavIcon 'rank' = médaille
}

function toIconName(icon: string): NavIconName {
  const known: NavIconName[] = [
    'home', 'admin', 'exercises', 'workout', 'library', 'session', 'rank',
    'classes', 'ai', 'vote', 'settings', 'search', 'calendar', 'video',
    'play', 'flame', 'bolt', 'grid', 'star', 'clock'
  ]
  if ((known as string[]).includes(icon)) return icon as NavIconName
  return ICON_ALIASES[icon] ?? 'rank'
}

export default function BadgeToken({ icon, state, size = 72, title, art, fresh = false }: Props) {
  const unlocked = state === 'unlocked'
  const soon = state === 'soon'

  // Visuel « Forge » : verrouillé, il passe en gris sombre avec un cadenas —
  // la silhouette reste lisible, c'est elle qui donne envie de le débloquer.
  if (art) {
    return (
      <span
        role="img"
        aria-label={title}
        title={title}
        className={`wb-badge-art is-${state}${fresh ? ' is-fresh' : ''}`}
        style={{ width: size, height: size, ['--art' as string]: `url(/badges/${art}.svg)` }}
      >
        <img src={`/badges/${art}.svg`} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} />
        {!unlocked && (
          <span className="wb-badge-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" fill="currentColor"/></svg>
          </span>
        )}
      </span>
    )
  }

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
