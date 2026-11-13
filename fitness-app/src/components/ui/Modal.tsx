import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useBackToClose } from '../../hooks/useBackToClose'

/**
 * Fenêtre modale partagée (phase 4, 4.2). Fond assombri et boîte centrée ;
 * rôle « dialog » relié à son titre ; Échap, le retour Android et un clic
 * sur le fond la ferment ; le focus entre dans la boîte (ou reste sur un
 * champ en autoFocus) et revient au déclencheur à la fermeture.
 */
export default function Modal({ title, onClose, wide = false, children }: {
  title: string
  onClose: () => void
  /** Boîte large (640 px au lieu de 460), pour une liste ou deux colonnes. */
  wide?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useBackToClose(true, onClose)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!boxRef.current?.contains(document.activeElement)) boxRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [])

  return (
    <div className="wb-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className={`wb-modal${wide ? ' wb-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="wb-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
