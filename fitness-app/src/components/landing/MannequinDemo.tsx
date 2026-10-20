import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Mannequin2D, { LOAD_COLORS } from '../mannequin/Mannequin2D'
import { computeMuscleLoads } from '../../lib/muscleLoad'
import { LOAD_LEVEL_I18N_KEYS, MUSCLE_GROUP_I18N_KEYS } from '../../types'
import { DEMO_MOVES, demoMoveName, toWorkoutExercise } from './demoMoves'
import s from './landing.module.css'

/**
 * Le mannequin du créateur de WOD, en libre-service sur la landing : on
 * coche des mouvements, les muscles s'allument avec le même moteur de
 * charge que dans l'app (computeMuscleLoads).
 */
export default function MannequinDemo() {
  const { t, i18n } = useTranslation('common')
  // Départ : un triplet classique, assez chargé pour que le mannequin s'allume.
  const [picked, setPicked] = useState<string[]>(['thruster', 'pullup', 'burpee'])

  const loads = useMemo(
    () => computeMuscleLoads(
      DEMO_MOVES.filter((m) => picked.includes(m.key)).map((m) => toWorkoutExercise(m, i18n.language))
    ),
    [picked, i18n.language]
  )
  const top = loads.filter((l) => l.level !== 'unused').slice(0, 3)

  function toggle(key: string) {
    setPicked((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]))
  }

  return (
    <div className={s.tryGrid}>
      <div>
        <p className={s.tryHint}>{t('landing.try.hint')}</p>
        <div className={s.tryChips} role='group' aria-label={t('landing.try.moves_label')}>
          {DEMO_MOVES.map((m) => {
            const on = picked.includes(m.key)
            return (
              <button key={m.key} type='button' aria-pressed={on} onClick={() => toggle(m.key)} className={`${s.tryChip} ${on ? s.tryChipOn : ''}`}>
                {demoMoveName(m, i18n.language)}
              </button>
            )
          })}
        </div>

        <div className={s.tryTop} aria-live='polite'>
          {top.length === 0 ? (
            <p>{t('landing.try.empty')}</p>
          ) : (
            <>
              <p className={s.tryTopLabel}>{t('landing.try.top_label')}</p>
              <ul>
                {top.map((l) => (
                  <li key={l.muscle}>
                    <span className={s.tryDot} style={{ background: LOAD_COLORS[l.level] }} aria-hidden='true' />
                    <strong>{t(MUSCLE_GROUP_I18N_KEYS[l.muscle])}</strong>
                    <span>{t(LOAD_LEVEL_I18N_KEYS[l.level])}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {picked.length > 0 && (
            <button type='button' className={s.tryReset} onClick={() => setPicked([])}>
              {t('landing.try.reset')}
            </button>
          )}
        </div>
      </div>

      <div className={s.tryBody}>
        <Mannequin2D loads={loads} height={300} bothViews />
      </div>
    </div>
  )
}
