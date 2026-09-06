import { useTranslation } from 'react-i18next'
import type { VoteResult } from '../../types'

/**
 * Barres de résultats d'un vote.
 *
 * Tout vient de la vue `vote_results` : libellé, couleur, décompte, pourcentage
 * et « en tête ». Aucun calcul ici — le coach et l'athlète voient donc
 * forcément les mêmes chiffres, ce qui n'était pas garanti quand chaque écran
 * agrégeait de son côté.
 *
 * La vue retourne une ligne par option même à zéro vote : les options
 * s'affichent avec leur couleur dès la création du vote.
 */
export default function VoteResultsBars({ results, emptyLabel }: {
  results: VoteResult[]
  emptyLabel: string
}) {
  const { t } = useTranslation('common')

  if (results.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, margin: 0 }}>
        — {emptyLabel}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {results.map((r) => (
        <div key={r.vote_option_id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.22rem', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: r.is_leading ? r.color : 'var(--muted)',
              fontWeight: r.is_leading ? 700 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {r.is_leading && '▶ '}{r.label}
            </span>
            <span style={{
              fontFamily: 'var(--font-d)', fontSize: '0.8125rem', letterSpacing: '0.08em',
              color: r.is_leading ? r.color : 'var(--muted)',
              fontWeight: r.is_leading ? 700 : 400, flexShrink: 0, whiteSpace: 'nowrap'
            }}>
              {r.percentage.toFixed(1)}% · {r.votes} {r.votes === 1 ? t('classes.vote_singular') : t('classes.vote_plural')}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--black)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, r.percentage))}%`,
              background: r.color,
              opacity: r.is_leading ? 1 : 0.6,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}
