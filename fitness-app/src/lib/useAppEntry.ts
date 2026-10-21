import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Où mène « Accéder à l'app » depuis la landing : la connexion si personne
 * n'est connecté, le tableau de bord sinon. Aller directement au bon écran
 * évite de passer par l'écran intermédiaire « vérification de la session »
 * pendant la transition de page.
 */
export function useAppEntry(): string {
  const [target, setTarget] = useState('/login')
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted && data.session) setTarget('/entraineur_dashboard') })
      .catch(() => { /* reste sur /login */ })
    return () => { mounted = false }
  }, [])
  return target
}
