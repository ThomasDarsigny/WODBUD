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
    <div className={`wb-estate${compact ? ' is-compact' : ''}`}>
      <span className="wb-estate-icon">
        <NavIcon name={icon} size={compact ? 20 : 26} strokeWidth={1.6} />
      </span>
      <p className="wb-estate-title">{title}</p>
      {hint && <p className="wb-estate-hint">{hint}</p>}
      {action && <div className="wb-estate-action">{action}</div>}
    </div>
  )
}
