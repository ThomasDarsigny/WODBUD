import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { computeMuscleLoads } from '../../lib/muscleLoad'
import { useExerciseStore } from '../../stores/exerciseStore'
import type { WorkoutExercise } from '../../types'
import Mannequin2D from './Mannequin2D'

interface Row {
  id: string
  exercise_id: string
  position: number
  sets: number | null
}

/**
 * Mannequin d'un workout déjà enregistré. Charge lui-même les lignes de
 * `workout_exercises` (à monter avec `key={workoutId}` pour repartir à zéro) : la bibliothèque et la séance en cours ne portent que
 * des workouts « légers » sans exercices détaillés.
 */
export default function WorkoutMannequin({ workoutId, height = 260 }: { workoutId: string; height?: number }) {
  const { t } = useTranslation('common')
  const exercises = useExerciseStore((s) => s.exercises)
  const fetchExercises = useExerciseStore((s) => s.fetchExercises)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (exercises.length === 0) void fetchExercises()
  }, [exercises.length, fetchExercises])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('id, exercise_id, position, sets')
        .eq('workout_id', workoutId)
        .order('position', { ascending: true })
      if (!mounted) return
      if (error) setFailed(true)
      else setRows((data ?? []) as Row[])
    })()
    return () => { mounted = false }
  }, [workoutId])

  const loads = useMemo(() => {
    if (!rows) return []
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const list: WorkoutExercise[] = []
    for (const r of rows) {
      const exercise = byId.get(r.exercise_id)
      if (!exercise) continue
      list.push({ id: r.id, exercise, position: r.position, sets: r.sets ?? undefined })
    }
    return computeMuscleLoads(list)
  }, [rows, exercises])

  const note = { fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 } as const

  if (failed) return <p style={note}>{t('errors.generic')}</p>
  if (rows === null) return <p style={note}>{t('status.loading')}</p>
  if (loads.length === 0) return <p style={note}>{t('mannequin.no_data')}</p>

  return <Mannequin2D loads={loads} height={height} bothViews />
}
