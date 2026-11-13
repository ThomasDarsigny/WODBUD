import { useEffect, useRef, useState, type RefObject } from 'react'
import { useBackToClose } from './useBackToClose'

/** Fenêtres ouvertes, de la plus ancienne à la plus récente : seule la dernière réagit à Échap. */
const stack: symbol[] = []

/**
 * Comportement commun des fenêtres (4.2) : Échap et le retour Android
 * ferment, le focus entre dans la boîte (sauf si un champ en autoFocus l'a
 * déjà) et revient au déclencheur à la fermeture. Avec des fenêtres
 * empilées, Échap ne ferme que celle du dessus.
 */
export function useDialog(boxRef: RefObject<HTMLElement | null>, onClose: () => void): void {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useBackToClose(true, onClose)
  // Le déclencheur, lu au premier rendu : un bouton en autoFocus dans la
  // fenêtre prend le focus avant que les effets ne s'exécutent.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))

  useEffect(() => {
    const me = Symbol('dialog')
    stack.push(me)
    const box = boxRef.current
    if (!box?.contains(document.activeElement)) box?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== me) return
      e.stopPropagation()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(me), 1)
      // Seulement à la vraie fermeture : en mode strict, React démonte puis
      // remonte aussitôt l'effet, la boîte restant dans la page.
      setTimeout(() => { if (box && !box.isConnected) opener?.focus() }, 0)
    }
  }, [boxRef, opener])
}
