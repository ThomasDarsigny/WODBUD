import { useTranslation } from 'react-i18next'
import { EQUIPMENT, type EquipmentId } from '../../lib/equipment'

/**
 * Liste d'équipement à cocher (inscription et réglages). Un préréglage coche
 * d'un geste le cas le plus courant : une box, ou la maison.
 */
export default function EquipmentPicker({ value, onChange, preset, presetLabel }: {
  value: EquipmentId[]
  onChange: (next: EquipmentId[]) => void
  preset?: EquipmentId[]
  presetLabel?: string
}) {
  const { t } = useTranslation('common')
  const chosen = new Set(value)
  const toggle = (id: EquipmentId) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(EQUIPMENT.filter((e) => next.has(e)))
  }

  return (
    <div className="wb-equip">
      <div className="wb-equip-actions">
        {preset && (
          <button type="button" className="wb-chip" onClick={() => onChange(EQUIPMENT.filter((e) => preset.includes(e) || chosen.has(e)))}>
            {presetLabel}
          </button>
        )}
        <button type="button" className="wb-chip" onClick={() => onChange(chosen.size === EQUIPMENT.length ? [] : [...EQUIPMENT])}>
          {chosen.size === EQUIPMENT.length ? t('equipment.none_all') : t('equipment.all')}
        </button>
        <span className="wb-equip-count" aria-live="polite">{t('equipment.count', { count: chosen.size })}</span>
      </div>
      <div className="wb-welcome-chips">
        {EQUIPMENT.map((id) => (
          <button key={id} type="button" className="wb-chip" aria-pressed={chosen.has(id)} onClick={() => toggle(id)}>
            {t(`equipment.items.${id}`)}
          </button>
        ))}
      </div>
      {chosen.size === 0 && <p className="wb-equip-hint">{t('equipment.bodyweight_hint')}</p>}
    </div>
  )
}
