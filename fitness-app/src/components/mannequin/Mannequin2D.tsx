import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LoadLevel, MuscleGroup, MuscleLoad } from '../../types'
import { LOAD_LEVELS, LOAD_LEVEL_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { loadOf } from '../../lib/muscleLoad'
import type { MannequinView } from './muscleMapPaths'
import { MUSCLE_SHAPES, NEUTRAL_SHAPES } from './muscleMapPaths'

/**
 * Cinq états, pas trois. Sans le gris, un muscle non travaillé serait vert
 * par défaut et le mannequin mentirait. Sans le bleu, impossible de distinguer
 * « bien dosé » de « à peine effleuré ».
 */
export const LOAD_COLORS: Record<LoadLevel, string> = {
  unused: 'var(--mannequin-idle, #3f3f46)',
  under: '#38bdf8',
  optimal: '#4ade80',
  high: '#facc15',
  overload: '#ef4444'
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
  view,
  loads,
  height,
  selected,
  onSelect
}: {
  view: MannequinView
  loads: MuscleLoad[]
  height: number
  selected: MuscleGroup | null
  onSelect: (m: MuscleGroup) => void
}) {
  const { t } = useTranslation('common')

  return (
    <svg
      viewBox='0 0 200 400'
      height={height}
      width={height / 2}
      role='img'
      aria-label={t('mannequin.title')}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {NEUTRAL_SHAPES[view].map((d, i) => (
        <path key={`n${i}`} d={d} fill='var(--mannequin-body, #2a2a2e)' />
      ))}

      {MUSCLE_SHAPES[view].map((shape, i) => {
        const load = loadOf(shape.muscle, loads)
        const level: LoadLevel = load?.level ?? 'unused'
        const isSelected = selected === shape.muscle
        const label = t(MUSCLE_GROUP_I18N_KEYS[shape.muscle])
        return (
          <path
            key={`${view}-${shape.muscle}-${shape.side ?? ''}-${i}`}
            d={shape.d}
            fill={LOAD_COLORS[level]}
            stroke={isSelected ? 'var(--ink, #fff)' : 'var(--mannequin-line, #111)'}
            strokeWidth={isSelected ? 2 : 1}
            opacity={level === 'unused' ? 0.85 : 1}
            style={{ cursor: 'pointer', transition: 'fill 0.25s ease, stroke-width 0.15s' }}
            onClick={() => onSelect(shape.muscle)}
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
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '0.35rem 0.6rem',
                border: `1px solid ${view === v ? 'var(--orange, #ff4d00)' : 'var(--border, #2a2a2a)'}`,
                background: view === v ? 'rgba(255,77,0,0.12)' : 'transparent',
                color: view === v ? 'var(--orange, #ff4d00)' : 'var(--muted, #8b8680)',
                cursor: 'pointer'
              }}
            >
              {t(v === 'front' ? 'mannequin.front' : 'mannequin.back')}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {views.map((v) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <BodySvg view={v} loads={loads} height={height} selected={selected} onSelect={handleSelect} />
            {bothViews && (
              <span
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted, #8b8680)'
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
            <strong style={{ fontSize: '0.85rem' }}>{t(MUSCLE_GROUP_I18N_KEYS[selected])}</strong>
            <span style={{ fontSize: '0.75rem', color: LOAD_COLORS[detail?.level ?? 'unused'] }}>
              {t(LOAD_LEVEL_I18N_KEYS[detail?.level ?? 'unused'])}
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--muted, #8b8680)' }}>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.66rem', color: 'var(--muted, #8b8680)' }}
          >
            <span style={{ width: 10, height: 10, background: LOAD_COLORS[lvl], display: 'inline-block' }} />
            {t(LOAD_LEVEL_I18N_KEYS[lvl])}
          </span>
        ))}
      </div>
    </div>
  )
}
