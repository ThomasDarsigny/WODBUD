import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LoadLevel, MuscleGroup, MuscleLoad } from '../../types'
import { LOAD_LEVELS, LOAD_LEVEL_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { loadOf } from '../../lib/muscleLoad'
import type { MannequinBody, MannequinView } from './bodyPaths'
import { BODY_SHAPES, VIEW_BOXES } from './bodyPaths'

/**
 * Cinq états, pas trois. Sans le gris, un muscle non travaillé serait vert
 * par défaut et le mannequin mentirait. Sans le bleu, impossible de distinguer
 * « bien dosé » de « à peine effleuré ».
 */
export const LOAD_COLORS: Record<LoadLevel, string> = {
  unused: 'var(--mannequin-idle, #423c36)',
  under: '#38bdf8',
  optimal: '#4ade80',
  high: '#facc15',
  overload: '#ef4444'
}

const BODY_KEY = 'wodbud_mannequin_body'

/**
 * Silhouette affichée. Volontairement gardée en localStorage et pas sur
 * `profiles` : c'est une préférence d'affichage, pas une donnée sur la
 * personne. L'écrire en base reviendrait à stocker un genre présumé, avec la
 * déclaration que ça implique dans la politique de confidentialité.
 */
export function readBodyPref(): MannequinBody {
  try {
    return localStorage.getItem(BODY_KEY) === 'female' ? 'female' : 'male'
  } catch {
    return 'male'
  }
}

export function storeBodyPref(body: MannequinBody) {
  try {
    localStorage.setItem(BODY_KEY, body)
    window.dispatchEvent(new CustomEvent('wodbud:mannequin-body'))
  } catch {
    // Mode privé : la préférence ne vit alors que le temps de la session.
  }
}

interface Props {
  loads: MuscleLoad[]
  /** Hauteur du SVG en px. Le ratio est conservé. */
  height?: number
  /** Affiche les deux vues côte à côte plutôt qu'un sélecteur. */
  bothViews?: boolean
  onMuscleClick?: (muscle: MuscleGroup) => void
}

function BodySvg({
  body,
  view,
  loads,
  height,
  selected,
  onSelect
}: {
  body: MannequinBody
  view: MannequinView
  loads: MuscleLoad[]
  height: number
  selected: MuscleGroup | null
  onSelect: (m: MuscleGroup) => void
}) {
  const { t } = useTranslation('common')
  const viewBox = VIEW_BOXES[body][view]
  const [, , vw, vh] = viewBox.split(' ').map(Number)

  return (
    <svg
      viewBox={viewBox}
      height={height}
      width={(height * vw) / vh}
      role='img'
      aria-label={t('mannequin.title')}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {BODY_SHAPES[body][view].map((shape, i) => {
        // Tête, mains, genoux, adducteurs : jamais colorés, jamais cliquables.
        if (shape.muscle === null) {
          return <path key={`n${i}`} d={shape.d} fill='var(--mannequin-body, #2b2724)' />
        }

        const load = loadOf(shape.muscle, loads)
        const level: LoadLevel = load?.level ?? 'unused'
        const isSelected = selected === shape.muscle
        const label = t(MUSCLE_GROUP_I18N_KEYS[shape.muscle])

        return (
          <path
            key={`m${i}`}
            d={shape.d}
            fill={LOAD_COLORS[level]}
            stroke={isSelected ? 'var(--white, #f2ede6)' : 'var(--mannequin-seam, rgba(242,237,230,0.5))'}
            strokeWidth={isSelected ? 5 : 2.5}
            strokeLinejoin='round'
            opacity={level === 'unused' ? 0.9 : 1}
            style={{ cursor: 'pointer', transition: 'fill 0.25s ease, stroke-width 0.15s' }}
            onClick={() => onSelect(shape.muscle as MuscleGroup)}
          >
            <title>
              {label} — {t(LOAD_LEVEL_I18N_KEYS[level])}
              {load ? ` (${load.sets} ${t('mannequin.sets')})` : ''}
            </title>
          </path>
        )
      })}
    </svg>
  )
}

export default function Mannequin2D({ loads, height = 340, bothViews = false, onMuscleClick }: Props) {
  const { t } = useTranslation('common')
  const [view, setView] = useState<MannequinView>('front')
  const [selected, setSelected] = useState<MuscleGroup | null>(null)
  const [body, setBody] = useState<MannequinBody>(readBodyPref)

  // La silhouette se change dans Paramètres : on écoute pour que le mannequin
  // suive sans qu'il faille recharger la page.
  useEffect(() => {
    const sync = () => setBody(readBodyPref())
    window.addEventListener('wodbud:mannequin-body', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('wodbud:mannequin-body', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const detail = useMemo(() => (selected ? loadOf(selected, loads) : undefined), [selected, loads])

  function handleSelect(m: MuscleGroup) {
    setSelected((prev) => (prev === m ? null : m))
    onMuscleClick?.(m)
  }

  const views: MannequinView[] = bothViews ? ['front', 'back'] : [view]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {!bothViews && (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['front', 'back'] as MannequinView[]).map((v) => (
            <button
              key={v}
              type='button'
              onClick={() => setView(v)}
              style={{
                flex: 1,
                fontFamily: 'var(--font-d)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                minHeight: 44,
                padding: '0.45rem 0.6rem',
                border: `1px solid ${view === v ? 'var(--orange, #ff5a1f)' : 'var(--border, #2e2a26)'}`,
                background: view === v ? 'rgba(255,90,31,0.12)' : 'transparent',
                color: view === v ? 'var(--orange, #ff5a1f)' : 'var(--muted, #9d958a)',
                cursor: 'pointer'
              }}
            >
              {t(v === 'front' ? 'mannequin.front' : 'mannequin.back')}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {views.map((v) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <BodySvg body={body} view={v} loads={loads} height={height} selected={selected} onSelect={handleSelect} />
            {bothViews && (
              <span
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted, #9d958a)'
                }}
              >
                {t(v === 'front' ? 'mannequin.front' : 'mannequin.back')}
              </span>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div
          style={{
            border: '1px solid var(--border, #2a2a2a)',
            padding: '0.6rem 0.75rem',
            background: 'var(--surf, rgba(255,255,255,0.02))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.8125rem' }}>{t(MUSCLE_GROUP_I18N_KEYS[selected])}</strong>
            <span style={{ fontSize: '0.8125rem', color: LOAD_COLORS[detail?.level ?? 'unused'] }}>
              {t(LOAD_LEVEL_I18N_KEYS[detail?.level ?? 'unused'])}
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: 'var(--muted, #9d958a)' }}>
            {detail && detail.sets > 0
              ? `${detail.sets} ${t('mannequin.sets')} · ${detail.exerciseNames.join(', ')}`
              : t('mannequin.no_mapping')}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 0.9rem' }}>
        {LOAD_LEVELS.map((lvl) => (
          <span
            key={lvl}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--muted, #9d958a)' }}
          >
            <span style={{ width: 11, height: 11, background: LOAD_COLORS[lvl], display: 'inline-block' }} />
            {t(LOAD_LEVEL_I18N_KEYS[lvl])}
          </span>
        ))}
      </div>
    </div>
  )
}
