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

/**
 * Groupe de choix (puces, cases) : un fieldset dont la légende nomme le
 * groupe. Une étiquette <label> autour de plusieurs boutons n'est pas
 * valide ; ceci l'est, et les lecteurs d'écran annoncent le groupe.
 */
export function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <fieldset className="wb-field wb-fieldset">
      <legend className="wb-field-label">
        {label}
        {required && <span className="wb-field-req" aria-hidden="true"> *</span>}
      </legend>
      {children}
    </fieldset>
  )
}
