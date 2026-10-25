import type { UIEvent } from 'react'

/**
 * Effet de bord de défilement : marque le conteneur dès qu'il a défilé, pour
 * que la barre en verre fonde le contenu qui passe dessous au lieu d'un trait
 * dur. Un attribut DOM plutôt qu'un état : aucun rendu React à chaque pixel.
 */
export function markScrolled(e: UIEvent<HTMLElement>) {
  const el = e.currentTarget
  const scrolled = el.scrollTop > 2
  if (el.hasAttribute('data-scrolled') !== scrolled) el.toggleAttribute('data-scrolled', scrolled)
}
