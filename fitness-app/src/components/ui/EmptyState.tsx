import type { ReactNode } from 'react'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'

/**
 * État vide.
 *
 * Un écran qui dit seulement « Aucun workout » laisse l'utilisateur devant un
 * mur : il voit bien qu'il n'y a rien, mais pas ce qu'il peut y faire. On donne
 * donc toujours les trois : ce qui manque, une phrase qui explique, et le
 * bouton qui règle le problème.
 *
 * Deux cas à ne pas confondre, d'où l'icône différente :
 *   - il n'existe rien encore  -> icône du contenu, action « créer »
 *   - le filtre ne renvoie rien -> loupe, action « réinitialiser »
 */
interface Props {
  icon: NavIconName
  title: string
  /** Une phrase, pas un paragraphe : ce que l'utilisateur peut faire ensuite. */
  hint?: string
  action?: ReactNode
  /** Pour les blocs insérés dans une colonne, pas au centre d'une page. */
  compact?: boolean
}

export default function EmptyState({ icon, title, hint, action, compact = false }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '0.8rem',
        padding: compact ? '1.9rem 1.2rem' : '3.2rem 1.5rem',
        border: '1px dashed var(--border)',
        background: 'var(--dark)'
      }}
    >
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: compact ? 42 : 54,
          height: compact ? 42 : 54,
          border: '1px solid rgba(255, 77, 0, 0.3)',
          background: 'rgba(255, 77, 0, 0.07)',
          color: 'var(--orange)',
          flexShrink: 0
        }}
      >
        <NavIcon name={icon} size={compact ? 20 : 26} strokeWidth={1.6} />
      </span>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-d)',
          fontSize: compact ? '0.92rem' : '1.05rem',
          fontWeight: 800,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--white)'
        }}
      >
        {title}
      </p>

      {hint && (
        <p
          style={{
            margin: 0,
            color: 'var(--muted)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            maxWidth: '40ch'
          }}
        >
          {hint}
        </p>
      )}

      {action && <div style={{ marginTop: '0.3rem' }}>{action}</div>}
    </div>
  )
}
