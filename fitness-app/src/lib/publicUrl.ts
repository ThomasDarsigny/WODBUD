import { isNativeApp } from './platform'

/**
 * Adresse publique du site, là où mènent les liens qu'on partage. À passer à
 * https://wodbud.com le jour où le domaine sera branché sur Vercel ; une
 * construction peut aussi la fixer avec `VITE_PUBLIC_SITE_URL`.
 */
export const PUBLIC_SITE_URL = (
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'https://fitness-ruddy-three.vercel.app'
).replace(/\/+$/, '')

/**
 * Origine des liens que l'app donne à quelqu'un d'autre : invitations, QR de
 * présence, rang partagé, retour des courriels de confirmation.
 *
 * Sur le web, l'adresse de la page : production, aperçu Vercel et serveur
 * local gardent chacun leurs liens. Dans l'app des boutiques, la page est
 * servie par le téléphone lui-même (`https://localhost`) : un lien bâti
 * dessus ne mènerait nulle part chez la personne qui le reçoit.
 */
export function publicOrigin(): string {
  if (isNativeApp()) return PUBLIC_SITE_URL
  return window.location.origin
}
