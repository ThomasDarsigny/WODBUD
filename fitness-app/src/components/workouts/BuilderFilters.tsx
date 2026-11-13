import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ExerciseCategory, MuscleGroup } from '../../types'
import { CATEGORY_I18N_KEYS, CATEGORY_LABELS, MUSCLE_GROUP_I18N_KEYS, MUSCLE_GROUP_LABELS } from '../../types'

interface Available { source: 'center' | 'home'; centerName: string | null; equipment: string[] }

/**
 * Filtres du créateur, repliés derrière un bouton : sur téléphone, ils
 * occupaient tout le premier écran avant le premier exercice. Le bouton dit
 * combien de filtres sont actifs, pour qu'un filtre oublié ne vide pas la
 * liste en silence.
 */
export default function BuilderFilters({
  open, onToggle, available, editEquipmentTo,
  onlyDoable, onOnlyDoable,
  categories, onCategory,
  muscles, onMuscle,
  onClear
}: {
  open: boolean
  onToggle: () => void
  available: Available | null
  editEquipmentTo: string
  onlyDoable: boolean
  onOnlyDoable: () => void
  categories: ExerciseCategory[]
  onCategory: (c: ExerciseCategory) => void
  muscles: MuscleGroup[]
  onMuscle: (m: MuscleGroup) => void
  onClear: () => void
}) {
  const { t } = useTranslation(['workouts', 'exercises', 'common'])
  const active = categories.length + muscles.length + (onlyDoable ? 1 : 0)

  return (
    <div className="wb-bfilters">
      <div className="wb-bfilters-bar">
        <button type="button" className={`wb-chip${active ? ' is-on' : ''}`} aria-expanded={open} aria-controls="builder-filters" onClick={onToggle}>
          {t('fields.filters', { ns: 'exercises' })}{active ? ` · ${active}` : ''} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        {active > 0 && (
          <button type="button" className="wb-bfilters-clear" onClick={onClear}>{t('builder.clear_filters')}</button>
        )}
      </div>

      {open && (
        <div id="builder-filters" className="wb-bfilters-panel">
          {available && (
            <div className="wb-bfilters-group">
              <p className="wb-builder-equip">
                <span>
                  {available.source === 'center'
                    ? t('builder.equipment_center', { name: available.centerName, count: available.equipment.length })
                    : t('builder.equipment_home', { count: available.equipment.length })}
                </span>
                <Link to={editEquipmentTo}>{t('builder.equipment_edit')}</Link>
              </p>
              <div className="wb-links-chips">
                <button type="button" className="wb-chip" aria-pressed={onlyDoable} onClick={onOnlyDoable}>{t('builder.only_doable')}</button>
              </div>
            </div>
          )}
          <div className="wb-bfilters-group">
            <p className="wb-bfilters-label">{t('fields.filter_category', { ns: 'exercises' })}</p>
            <div className="wb-links-chips">
              {(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]).map((c) => (
                <button key={c} type="button" className="wb-chip" aria-pressed={categories.includes(c)} onClick={() => onCategory(c)}>
                  {t(CATEGORY_I18N_KEYS[c], { ns: 'common' })}
                </button>
              ))}
            </div>
          </div>
          <div className="wb-bfilters-group">
            <p className="wb-bfilters-label">{t('fields.primary_muscle', { ns: 'exercises' })}</p>
            <div className="wb-links-chips">
              {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((m) => (
                <button key={m} type="button" className="wb-chip" aria-pressed={muscles.includes(m)} onClick={() => onMuscle(m)}>
                  {t(MUSCLE_GROUP_I18N_KEYS[m], { ns: 'common' })}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
