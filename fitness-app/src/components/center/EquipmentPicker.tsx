import { useTranslation } from 'react-i18next'
import { BODYWEIGHT, EQUIPMENT, EQUIPMENT_GROUPS, type EquipmentId } from '../../lib/equipment'

/**
 * Liste d'équipement à cocher, par familles repliables : la liste complète
 * tiendrait sur deux écrans de téléphone. Deux usages :
 *  - ce qu'on a sous la main (inscription, réglages), avec un préréglage qui
 *    coche d'un geste le cas le plus courant ;
 *  - ce qu'un exercice demande (`forExercise`), avec « Poids du corps », qui
 *    exclut tout le reste.
 */
export default function EquipmentPicker({ value, onChange, preset, presetLabel, forExercise = false }: {
  value: EquipmentId[]
  onChange: (next: EquipmentId[]) => void
  preset?: EquipmentId[]
  presetLabel?: string
  forExercise?: boolean
}) {
  const { t } = useTranslation('common')
  const chosen = new Set(value)
  const bodyweight = chosen.has(BODYWEIGHT)
  const allChosen = EQUIPMENT.every((e) => chosen.has(e))

  const toggle = (id: EquipmentId) => {
    const next = new Set(chosen)
    next.delete(BODYWEIGHT)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(EQUIPMENT.filter((e) => next.has(e)))
  }

  return (
    <div className="wb-equip">
      {forExercise ? (
        <div className="wb-equip-actions">
          <button type="button" className="wb-chip" aria-pressed={bodyweight} onClick={() => onChange(bodyweight ? [] : [BODYWEIGHT])}>
            {t('equipment.items.bodyweight')}
          </button>
          <span className="wb-equip-count" aria-live="polite">{t('equipment.count', { count: bodyweight ? 0 : chosen.size })}</span>
        </div>
      ) : (
        <div className="wb-equip-actions">
          {preset && (
            <button type="button" className="wb-chip" onClick={() => onChange(EQUIPMENT.filter((e) => preset.includes(e) || chosen.has(e)))}>
              {presetLabel}
            </button>
          )}
          <button type="button" className="wb-chip" onClick={() => onChange(allChosen ? [] : [...EQUIPMENT])}>
            {allChosen ? t('equipment.none_all') : t('equipment.all')}
          </button>
          <span className="wb-equip-count" aria-live="polite">{t('equipment.count', { count: chosen.size })}</span>
        </div>
      )}

      {EQUIPMENT_GROUPS.map((group, index) => {
        const count = group.items.filter((id) => chosen.has(id)).length
        return (
          <details key={group.id} className="wb-equip-group" open={index === 0}>
            <summary>
              <span>{t(`equipment.groups.${group.id}`)}</span>
              {count > 0 && <span className="wb-equip-badge">{count}</span>}
            </summary>
            <div className="wb-welcome-chips">
              {group.items.map((id) => (
                <button key={id} type="button" className="wb-chip" aria-pressed={chosen.has(id)} onClick={() => toggle(id)}>
                  {t(`equipment.items.${id}`)}
                </button>
              ))}
            </div>
          </details>
        )
      })}

      {!forExercise && chosen.size === 0 && <p className="wb-equip-hint">{t('equipment.bodyweight_hint')}</p>}
    </div>
  )
}
