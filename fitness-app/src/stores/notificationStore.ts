import { create } from 'zustand'
import {
  NO_NOTIFICATIONS,
  acknowledgeProgress,
  fetchNotifications,
  type NotificationCounts
} from '../lib/notifications'

/**
 * État des pastilles de navigation.
 *
 * Dans un store plutôt que dans un hook local : les deux barres latérales
 * (coach et athlète) et les écrans qui accusent réception doivent voir la même
 * valeur, sans la recharger chacun de leur côté.
 */
interface NotificationState extends NotificationCounts {
  refresh: () => Promise<void>
  /** Appelé en ouvrant « Mon rang » : éteint les pastilles badge et rang. */
  markProgressSeen: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  ...NO_NOTIFICATIONS,

  refresh: async () => {
    try {
      set(await fetchNotifications())
    } catch {
      // Une pastille absente vaut mieux qu'un écran cassé.
    }
  },

  markProgressSeen: async () => {
    // Optimiste : la pastille s'éteint tout de suite, l'écriture suit.
    set({ newBadges: 0, rankUp: false })
    try {
      await acknowledgeProgress()
    } catch {
      // Sans écriture, la pastille reviendra au prochain chargement.
    }
  }
}))
