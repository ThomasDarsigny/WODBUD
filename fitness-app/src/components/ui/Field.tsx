import type { ReactNode } from 'react'

/**
 * Champ de formulaire partagé (phase 4, 4.2) : l'étiquette englobe le
 * contrôle, ce qui les relie pour les lecteurs d'écran et rend toute
 * l'étiquette cliquable. « * » marque un champ obligatoire (mettre aussi
 * `required` sur le contrôle).
 */
export default function Field({ label, required, hint, children }: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="wb-field">
      <span className="wb-field-label">
        {label}
        {required && <span className="wb-field-req" aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <span className="wb-field-hint">{hint}</span>}
    </label>
  )
}
