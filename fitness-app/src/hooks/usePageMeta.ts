import { useEffect } from 'react'

/**
 * Titre et description propres à une page.
 *
 * index.html porte ceux de la landing. Sans ça, /login, /signup et la
 * politique de confidentialité s'afficheraient tous avec le même titre dans
 * l'onglet, l'historique et les résultats de recherche. Restaure les valeurs
 * précédentes au démontage pour que la navigation SPA ne les laisse pas traîner.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const previousDescription = meta?.content
    if (meta && description) meta.content = description

    return () => {
      document.title = previousTitle
      if (meta && previousDescription !== undefined) meta.content = previousDescription
    }
  }, [title, description])
}
