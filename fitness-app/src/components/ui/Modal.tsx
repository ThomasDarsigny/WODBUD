import { useId, useRef, type ReactNode } from 'react'
import { useDialog } from '../../hooks/useDialog'

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
  useDialog(boxRef, onClose)

  return (
    <div className="wb-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className={`wb-modal${wide ? ' wb-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="wb-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
