import { PUBLIC_SITE_URL } from './publicUrl'

/**
 * Liens du site ouverts dans l'app des boutiques (A3, App Links Android).
 *
 * Un lien d'invitation, de communauté ou un QR de présence pointe vers le
 * site public. Quand l'app est installée, Android le lui confie (filtre
 * d'intention de AndroidManifest.xml, vérifié par le fichier
 * public/.well-known/assetlinks.json du site) : elle ouvre la même page, avec
 * la session de l'app. Sans l'app, le lien ouvre le site, comme avant.
 */

/** Domaines du site : l'adresse publique actuelle, et wodbud.com une fois branché. */
const HOSTS = new Set([new URL(PUBLIC_SITE_URL).host, 'wodbud.com', 'www.wodbud.com'])

/** Page de l'app pour un lien reçu, ou null s'il ne vient pas du site. */
export function inAppPath(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || !HOSTS.has(parsed.host)) return null
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

/** Mène à une page de l'app, avant comme après le démarrage du routeur. */
export function openInApp(path: string): void {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
