import type { CSSProperties } from 'react'

/**
 * Styles partagés de l'interface.
 *
 * Raison d'être : l'app portait 742 blocs de style en ligne sur 33 fichiers,
 * avec 102 valeurs de `padding` distinctes et 40 tailles de police. Aucun jeton
 * ne peut être respecté quand chaque valeur est retapée à la main sur place.
 * Importer d'ici plutôt que retaper est ce qui empêche l'incohérence de revenir.
 *
 * Les valeurs viennent du système documenté : échelle typographique à 7 crans,
 * espacement en base 4 px, contrastes vérifiés AA, angles vifs.
 */

/* ── Typographie ─────────────────────────────────────────────────────
   Règle unique : les capitales espacées appartiennent à `label` et au
   display. Au-delà de trois mots, casse normale. */

export const text = {
  display: 'clamp(2.5rem, 6vw, 3.5rem)',
  h1: '1.75rem',
  h2: '1.25rem',
  lg: '1rem',
  body: '0.9375rem',
  sm: '0.8125rem',
  label: '0.6875rem'
} as const

/* ── Espacement, base 4 px ───────────────────────────────────────── */

export const space = {
  s1: '0.25rem',
  s2: '0.5rem',
  s3: '0.75rem',
  s4: '1rem',
  s5: '1.5rem',
  s6: '2rem',
  s7: '3rem'
} as const

/** Toute transition de l'app. Une durée, une courbe. */
export const motion = 'var(--t-fast) var(--ease)'

/* ── Titres ──────────────────────────────────────────────────────── */

export const pageTitle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.h1,
  fontWeight: 900,
  letterSpacing: '0.01em',
  textTransform: 'uppercase',
  lineHeight: 1.05,
  margin: 0
}

export const sectionTitle: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.h2,
  fontWeight: 800,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  lineHeight: 1.15,
  margin: 0
}

/** Sur-titre orange au-dessus d'un titre de page. */
export const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.label,
  fontWeight: 700,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: 'var(--orange)',
  margin: 0
}

/** Le seul endroit légitime pour des capitales espacées, avec le display. */
export const label: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.label,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  display: 'block'
}

export const helpText: CSSProperties = {
  fontSize: text.sm,
  color: 'var(--muted)',
  lineHeight: 1.55,
  margin: 0
}

/* ── Boutons ─────────────────────────────────────────────────────────
   44 px de haut : la cible tactile minimale. L'ancien primaire faisait
   30 px, ce qui le rendait difficile à viser en salle, une main occupée. */

/**
 * Socle sans couleur. Pour les boutons dont la couleur est décidée au point
 * d'appel (confirmation destructive, bascule d'état). Préférer les variantes
 * nommées ci-dessous partout ailleurs.
 */
export const btnBase: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.sm,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: `0 ${space.s5}`,
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space.s2,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: `background ${motion}, border-color ${motion}, color ${motion}`
}

export const btnPrimary: CSSProperties = {
  ...btnBase,
  color: 'var(--black)',
  background: 'var(--orange)',
  border: '1px solid var(--orange)'
}

/** Bordure à 3,26:1 : contrairement à l'ancienne, elle se voit. */
export const btnSecondary: CSSProperties = {
  ...btnBase,
  color: 'var(--white)',
  background: 'transparent',
  border: '1px solid var(--line-fn)'
}

export const btnGhost: CSSProperties = {
  ...btnBase,
  color: 'var(--muted)',
  background: 'transparent',
  border: '1px solid transparent'
}

export const btnDanger: CSSProperties = {
  ...btnBase,
  color: '#ffc7bf',
  background: 'transparent',
  border: '1px solid #6b2422'
}

/** Bouton compact — barres d'outils denses uniquement, jamais une action principale. */
/** Contour orange : action secondaire mais valorisée (Paramètres, partage). */
export const btnAccent: CSSProperties = {
  ...btnBase,
  color: 'var(--orange)',
  background: 'transparent',
  border: '1px solid var(--orange)'
}

export const btnSmall: CSSProperties = {
  ...btnSecondary,
  fontSize: text.label,
  padding: `0 ${space.s3}`,
  minHeight: 36,
  letterSpacing: '0.1em'
}

/* ── Surfaces ────────────────────────────────────────────────────────
   Les cartes ne dépendent plus de leur bordure pour exister : l'écart
   entre --dark et --black leur donne un volume, ce qu'une ombre portée
   ferait au prix de l'identité brutaliste. */

export const card: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--dark)',
  padding: space.s4
}

/** Carte cliquable : le liseré orange remplace l'ombre. */
export const cardInteractive: CSSProperties = {
  ...card,
  borderLeft: '2px solid var(--orange)',
  cursor: 'pointer',
  transition: `background ${motion}, border-color ${motion}`
}

export const panel: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  padding: space.s5
}

/* ── Formulaires ─────────────────────────────────────────────────── */

export const field: CSSProperties = {
  width: '100%',
  background: 'var(--black)',
  border: '1px solid var(--line-fn)',
  color: 'var(--white)',
  padding: `0 ${space.s3}`,
  minHeight: 44,
  fontFamily: 'var(--font-b)',
  fontSize: text.body,
  transition: `border-color ${motion}`
}

/** Un textarea a besoin d'un padding vertical, contrairement à un input. */
export const textarea: CSSProperties = {
  ...field,
  padding: space.s3,
  minHeight: 96,
  lineHeight: 1.55,
  resize: 'vertical'
}

/**
 * Champ compact — tableaux denses uniquement (import OCR, grille du
 * constructeur), où 44 px par ligne rendrait la saisie impraticable.
 * Reste au-dessus de 36 px et garde la bordure lisible.
 */
export const fieldCompact: CSSProperties = {
  ...field,
  minHeight: 36,
  fontSize: text.sm,
  padding: `0 ${space.s2}`
}

export const fieldGroup: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space.s2
}

/* ── Étiquettes ──────────────────────────────────────────────────── */

export const badge: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.label,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '0.12rem 0.5rem',
  display: 'inline-block',
  whiteSpace: 'nowrap',
  color: 'var(--muted)',
  border: '1px solid var(--border)'
}

/** Étiquette sans couleur : la teinte vient du point d'appel (muscles, méthodes). */
export const badgeBase: CSSProperties = {
  fontFamily: 'var(--font-d)',
  fontSize: text.label,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '0.2rem 0.55rem',
  display: 'inline-block',
  whiteSpace: 'nowrap'
}

export const badgeAccent: CSSProperties = {
  ...badge,
  color: 'var(--orange)',
  background: 'rgba(255, 90, 31, 0.12)',
  border: '1px solid rgba(255, 90, 31, 0.35)'
}

/* ── Divers ──────────────────────────────────────────────────────── */

/** Chrono, classements, séries : sans ça les chiffres dansent, le 1 étant
 *  plus étroit que le 8. */
export const tabularNums: CSSProperties = { fontVariantNumeric: 'tabular-nums' }

export const divider: CSSProperties = {
  height: 1,
  background: 'var(--border)',
  border: 0
}
