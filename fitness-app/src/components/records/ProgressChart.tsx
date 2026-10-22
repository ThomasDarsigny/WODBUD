import { useMemo, useState } from 'react'

export interface ChartPoint {
  /** ISO */
  at: string
  value: number
  label: string
}

interface Props {
  points: ChartPoint[]
  /** Pour un temps, plus bas = mieux : l'axe est inversé, la courbe monte quand on progresse. */
  lowerIsBetter?: boolean
  ariaLabel: string
  dateFormat: (iso: string) => string
}

const W = 340
const H = 160
const PAD = { top: 16, right: 14, bottom: 26, left: 14 }

/**
 * Courbe de progression d'un mouvement : une série, une couleur, un point par
 * résultat. Toucher un point affiche sa valeur ; la liste sous le graphique
 * reste la vue tableau.
 */
export default function ProgressChart({ points, lowerIsBetter = false, ariaLabel, dateFormat }: Props) {
  const [active, setActive] = useState<number | null>(null)

  const geo = useMemo(() => {
    const sorted = [...points].sort((a, b) => a.at.localeCompare(b.at))
    const times = sorted.map((p) => Date.parse(p.at))
    const values = sorted.map((p) => p.value)
    const t0 = Math.min(...times), t1 = Math.max(...times)
    let v0 = Math.min(...values), v1 = Math.max(...values)
    // Un peu d'air au-dessus et au-dessous, et jamais une échelle plate.
    const span = v1 - v0 || Math.max(1, v1 * 0.1)
    v0 -= span * 0.15
    v1 += span * 0.15
    const x = (t: number) => PAD.left + (t1 === t0 ? (W - PAD.left - PAD.right) / 2 : ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right))
    const y = (v: number) => {
      const r = (v - v0) / (v1 - v0)
      return PAD.top + (lowerIsBetter ? r : 1 - r) * (H - PAD.top - PAD.bottom)
    }
    const xy = sorted.map((p, i) => ({ ...p, x: x(times[i]), y: y(values[i]) }))
    const best = lowerIsBetter ? Math.min(...values) : Math.max(...values)
    return { xy, bestY: y(best), first: sorted[0], last: sorted[sorted.length - 1] }
  }, [points, lowerIsBetter])

  if (points.length === 0) return null
  const path = geo.xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const a = active === null ? null : geo.xy[active]

  return (
    <figure className="wb-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onPointerLeave={() => setActive(null)}>
        {/* Ligne du record : la référence qu'on cherche à dépasser. */}
        <line x1={PAD.left} x2={W - PAD.right} y1={geo.bestY} y2={geo.bestY} className="wb-chart-best" />
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="wb-chart-axis" />
        {geo.xy.length > 1 && <path d={path} className="wb-chart-line" />}
        {geo.xy.map((p, i) => (
          <g key={`${p.at}-${i}`}>
            <circle cx={p.x} cy={p.y} r={i === active ? 6 : 4.5} className="wb-chart-dot" />
            {/* Cible tactile plus grande que le point. */}
            <circle
              cx={p.x} cy={p.y} r={16} fill="transparent"
              onPointerEnter={() => setActive(i)}
              onClick={() => setActive(i)}
            />
          </g>
        ))}
        <text x={PAD.left} y={H - 8} className="wb-chart-tick">{dateFormat(geo.first.at)}</text>
        {geo.xy.length > 1 && <text x={W - PAD.right} y={H - 8} textAnchor="end" className="wb-chart-tick">{dateFormat(geo.last.at)}</text>}
      </svg>
      {a && (
        <figcaption
          className="wb-chart-tip"
          // Bornée : l'infobulle d'un point au bord reste dans le cadre.
          style={{ left: `clamp(3.5rem, ${(a.x / W) * 100}%, calc(100% - 3.5rem))`, top: `${(a.y / H) * 100}%` }}
        >
          <strong>{a.label}</strong>
          <span>{dateFormat(a.at)}</span>
        </figcaption>
      )}
    </figure>
  )
}
