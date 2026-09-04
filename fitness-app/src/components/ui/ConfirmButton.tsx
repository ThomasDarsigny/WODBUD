import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Bouton de suppression à deux temps.
 *
 * Remplace `confirm()` : la boîte de dialogue native bloque tout le fil
 * d'exécution, s'affiche hors du style de l'app, et sur une PWA installée elle
 * rend particulièrement mal. Ici, le premier clic arme, le second confirme, et
 * l'armement retombe tout seul au bout de quelques secondes — donc un clic
 * distrait ne détruit rien.
 */
export default function ConfirmButton({ children, confirmLabel, onConfirm, style, title, resetMs = 4000 }: {
  children: ReactNode
  /** Texte affiché une fois le bouton armé. Par défaut « Confirmer ». */
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  style?: CSSProperties
  title?: string
  resetMs?: number
}) {
  const { t } = useTranslation('common')
  const [armed, setArmed] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  function handleClick() {
    if (armed) {
      if (timer.current !== null) window.clearTimeout(timer.current)
      setArmed(false)
      void onConfirm()
      return
    }
    setArmed(true)
    timer.current = window.setTimeout(() => setArmed(false), resetMs)
  }

  return (
    <button
      onClick={handleClick}
      title={armed ? undefined : title}
      style={{
        ...style,
        ...(armed
          ? { color: 'var(--black)', background: '#ef4444', borderColor: '#ef4444' }
          : null)
      }}
    >
      {armed ? (confirmLabel ?? t('actions.confirm')) : children}
    </button>
  )
}
