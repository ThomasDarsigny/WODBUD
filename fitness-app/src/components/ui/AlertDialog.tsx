import { useId, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '../../hooks/useDialog'

/**
 * Avertissement qui demande une décision (4.2) : « Ajouter quand même ? ».
 * Rôle « alertdialog », titre et message reliés, ✕ étiqueté ; Échap, le
 * retour Android et un clic sur le fond annulent. La teinte dit la gravité.
 */
export default function AlertDialog({ title, tone = 'orange', onClose, actions, children }: {
  title: string
  tone?: 'orange' | 'amber'
  onClose: () => void
  /** Les boutons, du moins engageant au plus engageant. */
  actions: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation('common')
  const titleId = useId()
  const bodyId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  useDialog(boxRef, onClose)

  return (
    <div className="wb-modal-overlay wb-modal-overlay--alert" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={boxRef} className={`wb-alert wb-alert--${tone}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} tabIndex={-1}>
        <div className="wb-alert-head">
          <p id={titleId} className="wb-alert-title">{title}</p>
          <button type="button" className="wb-alert-close" onClick={onClose} aria-label={t('actions.close')}>✕</button>
        </div>
        <div id={bodyId} className="wb-alert-body">{children}</div>
        <div className="wb-alert-actions">{actions}</div>
      </div>
    </div>
  )
}
