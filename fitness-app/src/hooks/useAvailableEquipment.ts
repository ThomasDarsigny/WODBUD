import { useEffect, useState } from 'react'
import { fetchMyCenter } from '../lib/center'
import { fetchMyEquipment } from '../lib/profileRole'
import { cleanEquipment, type EquipmentId } from '../lib/equipment'

export interface AvailableEquipment {
  equipment: EquipmentId[]
  /** D'où vient la liste : l'inventaire du centre, ou celui du compte (maison). */
  source: 'center' | 'home'
  centerName: string | null
}

/**
 * L'équipement sous la main : celui du centre dont on fait partie, sinon
 * celui déclaré sur le compte. `null` pendant le chargement ou si la
 * lecture échoue — l'appelant affiche alors tout, sans tri.
 */
export function useAvailableEquipment(): AvailableEquipment | null {
  const [value, setValue] = useState<AvailableEquipment | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const mine = await fetchMyCenter()
      if (mine) return { equipment: mine.center.equipment, source: 'center' as const, centerName: mine.center.name }
      return { equipment: cleanEquipment(await fetchMyEquipment()), source: 'home' as const, centerName: null }
    })()
      .then((v) => { if (alive) setValue(v) })
      .catch(() => { if (alive) setValue(null) })
    return () => { alive = false }
  }, [])
  return value
}
