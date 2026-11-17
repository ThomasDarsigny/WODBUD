import { useId, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { niceMax } from '../../lib/weekly'

/**
 * Une valeur par semaine, en colonnes (constat 08 de l'audit). Une seule
 * série : pas de légende, le titre la nomme. Colonnes fines (24 px au plus,
 * haut arrondi, posées sur la ligne de base), grille discrète, valeur écrite
 * seulement sur la semaine en cours ; le détail d'une semaine au survol ou au
 * clavier, et le tableau des chiffres pour qui ne lit pas le graphique.
 */
export default function WeeklyColumns({ title, weeks, values, format, short }: {
  title: string
  /** Lundis, du plus ancien au plus récent. */
  weeks: string[]
  values: number[]
  /** Valeur en toutes lettres (« 14 présences »). */
  format: (n: number) => string
  /** Valeur courte, pour l'axe et la semaine en cours (« 14 »). */
  short: (n: number) => string
}) {
  const { t, i18n } = useTranslation('common')
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const top = niceMax(Math.max(...values, 0))
  const day = (w: string) => new Date(`${w}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
  const last = values.length - 1

  return (
    <figure className="wb-wk" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="wb-wk-title">{title}</figcaption>
      <div className="wb-wk-plot">
        <div className="wb-wk-grid" aria-hidden="true">
          {[1, 0.5, 0].map((f) => (
            <span key={f} className="wb-wk-line" style={{ bottom: `${f * 100}%` }}>
              <span className="wb-wk-tick">{short(top * f)}</span>
            </span>
          ))}
        </div>
        <ol className="wb-wk-cols" style={{ '--n': weeks.length } as CSSProperties} onPointerLeave={() => setActive(null)}>
          {weeks.map((w, i) => {
            const h = `${(values[i] / top) * 100}%`
            return (
              <li key={w} className={`wb-wk-col${i === last ? ' is-current' : ''}${(last - i) % 2 === 1 ? ' is-odd' : ''}`} onPointerEnter={() => setActive(i)}>
                <span className="wb-wk-slot" style={{ '--h': h } as CSSProperties}>
                  <span
                    className="wb-wk-bar"
                    role="img"
                    tabIndex={0}
                    aria-label={`${t('charts.week_of', { date: day(w) })} : ${format(values[i])}`}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                  {i === last && active !== i && <span className="wb-wk-cap" aria-hidden="true">{short(values[i])}</span>}
                  {active === i && (
                    <span className="wb-wk-tip" aria-hidden="true">
                      <strong>{format(values[i])}</strong>
                      <span>{t('charts.week_of', { date: day(w) })}</span>
                    </span>
                  )}
                </span>
                <span className="wb-wk-x" aria-hidden="true">{day(w)}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <details className="wb-wk-table">
        <summary>{t('charts.show_table')}</summary>
        <table>
          <thead><tr><th scope="col">{t('charts.col_week')}</th><th scope="col">{title}</th></tr></thead>
          <tbody>
            {weeks.map((w, i) => <tr key={w}><td>{t('charts.week_of', { date: day(w) })}</td><td>{format(values[i])}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
