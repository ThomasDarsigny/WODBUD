import { useLocation } from 'react-router-dom'

/**
 * Espace courant : '/athlete' (membre, perso) ou '/dashboard' (centre).
 * Les écrans partagés entre les deux (créateur, WODs, exercices, IA)
 * s'en servent pour leurs liens internes.
 */
export function useSpaceBase(): '/athlete' | '/dashboard' {
  return useLocation().pathname.startsWith('/athlete') ? '/athlete' : '/dashboard'
}
