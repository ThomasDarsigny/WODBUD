import type { CSSProperties } from 'react'
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
    return <p className="wb-vres-empty">— {emptyLabel}</p>
  }

  return (
    <div className="wb-vres">
      {results.map((r) => (
        <div
          key={r.vote_option_id}
          className={`wb-vres-row${r.is_leading ? ' is-leading' : ''}`}
          // Couleur de l'option et part des votes : les deux seules valeurs calculées.
          style={{ '--opt': r.color, '--pct': `${Math.max(0, Math.min(100, r.percentage))}%` } as CSSProperties}
        >
          <div className="wb-vres-head">
            <span className="wb-vres-label">{r.is_leading && '▶ '}{r.label}</span>
            <span className="wb-vres-count">
              {r.percentage.toFixed(1)}% · {r.votes} {r.votes === 1 ? t('classes.vote_singular') : t('classes.vote_plural')}
            </span>
          </div>
          {/* La barre redit le pourcentage écrit juste au-dessus : décorative. */}
          <div className="wb-vres-track" aria-hidden="true">
            <div className="wb-vres-fill" />
          </div>
        </div>
      ))}
    </div>
  )
}
