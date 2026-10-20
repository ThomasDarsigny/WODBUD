/**
 * Liens vers les fiches de l'app dans les boutiques.
 *
 * L'app n'y est pas encore : on pointe vers la boutique elle-même, et la
 * section de la landing affiche « Bientôt ». Le jour de la publication, il
 * suffit de renseigner VITE_APP_STORE_URL / VITE_PLAY_STORE_URL (ou de
 * remplacer les valeurs ici) et de passer STORES_LIVE à true.
 */
export const APP_STORE_URL: string =
  import.meta.env.VITE_APP_STORE_URL || 'https://www.apple.com/app-store/'

export const PLAY_STORE_URL: string =
  import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps'

/** false tant que les fiches n'existent pas : affiche « Bientôt sur ». */
export const STORES_LIVE = Boolean(import.meta.env.VITE_APP_STORE_URL && import.meta.env.VITE_PLAY_STORE_URL)
