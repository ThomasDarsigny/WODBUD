/**
 * Partage d'un lien d'invitation (6.1) : la feuille de partage du téléphone
 * (Messages, WhatsApp, courriel…) avec un message prérempli ; sinon le lien
 * est copié. Une seule façon de faire pour les cours, les communautés et
 * l'équipe d'un centre.
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareLink({ title, text, url }: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // Feuille fermée par la personne : rien à signaler.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Autre refus (contexte non sécurisé, permission) : on se rabat sur la copie.
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
