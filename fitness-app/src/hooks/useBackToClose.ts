import { useEffect, useId, useRef } from 'react'

/**
 * Retour Android (bouton ou geste) : ferme la feuille ou la fenêtre ouverte
 * au lieu de quitter la page, comme une app native.
 *
 * À l'ouverture, on empile une entrée d'historique (même URL) ; « retour » la
 * dépile et on ferme. Si on ferme autrement (✕, Échap, clic dehors), on retire
 * nous-mêmes l'entrée pour qu'il ne faille pas deux « retour » ensuite.
 * Les fenêtres empilées marchent : chacune a sa propre entrée.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const id = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const pushed = useRef(false)
  const active = useRef(false)

  useEffect(() => {
    if (!open) return
    active.current = true
    if (!pushed.current) {
      window.history.pushState({ ...window.history.state, wbOverlay: id }, '')
      pushed.current = true
    }
    const onPop = () => {
      if (window.history.state?.wbOverlay === id) return
      pushed.current = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      active.current = false
      // Différé : en mode strict, React démonte puis remonte aussitôt ; seule
      // une vraie fermeture laisse `active` à faux. Si une navigation a déjà
      // remplacé notre entrée, on n'y touche pas (sinon on l'annulerait).
      setTimeout(() => {
        if (active.current || !pushed.current) return
        pushed.current = false
        if (window.history.state?.wbOverlay === id) window.history.back()
      }, 0)
    }
  }, [open, id])
}
