import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { sortSlots, type ClassSlot } from '../lib/classSlots'

/**
 * Horaires des cours (3.1), partagés entre l'éditeur du coach, le calendrier
 * de la semaine, la feuille des cycles et l'accueil athlète.
 */
interface ClassSlotState {
  byClass: Record<string, ClassSlot[]>
  fetchSlots: (classIds: string[]) => Promise<void>
  addSlots: (classId: string, weekdays: number[], startTime: string, durationMinutes: number) => Promise<void>
  removeSlot: (slot: ClassSlot) => Promise<void>
}

export const useClassSlotStore = create<ClassSlotState>((set) => ({
  byClass: {},

  fetchSlots: async (classIds) => {
    const ids = [...new Set(classIds)]
    if (ids.length === 0) return
    const { data, error } = await supabase
      .from('class_slots')
      .select('id, class_id, weekday, start_time, duration_minutes')
      .in('class_id', ids)
    if (error) return
    const next: Record<string, ClassSlot[]> = Object.fromEntries(ids.map((id) => [id, []]))
    for (const row of data ?? []) next[row.class_id].push(row)
    for (const id of ids) next[id] = sortSlots(next[id])
    set((s) => ({ byClass: { ...s.byClass, ...next } }))
  },

  addSlots: async (classId, weekdays, startTime, durationMinutes) => {
    if (weekdays.length === 0) return
    // Un créneau déjà là (même jour, même heure) est ignoré, pas une erreur.
    const { data, error } = await supabase
      .from('class_slots')
      .upsert(
        weekdays.map((weekday) => ({ class_id: classId, weekday, start_time: startTime, duration_minutes: durationMinutes })),
        { onConflict: 'class_id,weekday,start_time', ignoreDuplicates: true }
      )
      .select('id, class_id, weekday, start_time, duration_minutes')
    if (error) throw error
    set((s) => {
      const current = s.byClass[classId] ?? []
      const fresh = (data ?? []).filter((row) => !current.some((c) => c.id === row.id))
      return { byClass: { ...s.byClass, [classId]: sortSlots([...current, ...fresh]) } }
    })
  },

  removeSlot: async (slot) => {
    const { error } = await supabase.from('class_slots').delete().eq('id', slot.id)
    if (error) throw error
    set((s) => ({ byClass: { ...s.byClass, [slot.class_id]: (s.byClass[slot.class_id] ?? []).filter((x) => x.id !== slot.id) } }))
  }
}))
