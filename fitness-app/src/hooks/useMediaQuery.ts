import { useCallback, useSyncExternalStore } from 'react'

/**
 * Écoute une media query.
 *
 * Les styles de l'app sont en ligne, donc inaccessibles aux `@media` : la
 * seule façon d'adapter la mise en page à la largeur réelle est de la lire
 * en JavaScript.
 *
 * `useSyncExternalStore` plutôt qu'un `useState` + `useEffect` : la valeur est
 * lue directement de la source au rendu, donc pas de flash de mise en page
 * bureau sur téléphone, et pas de setState pendant un effet.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** Seuil unique pour toute l'app : en dessous, on est en présentation téléphone. */
export const MOBILE_QUERY = '(max-width: 768px)'

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
