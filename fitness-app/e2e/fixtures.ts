import { test as base, expect } from '@playwright/test'
import { MockSupabase, type MockUser, type Row } from './supabase-mock'

/**
 * Données de test : un mercredi matin (18 novembre 2026, 5 h 45), un coach
 * de centre, son cours « CrossFit 6h » (lundi, mercredi, vendredi à 6 h),
 * trois athlètes, Fran au programme du jour. Tout est fictif.
 */
export const NOW = new Date(2026, 10, 18, 5, 45)
export const TODAY = '2026-11-18'
export function day(offset: number): string {
  const d = new Date(2026, 10, 18 + offset, 12)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const COACH: MockUser = { id: '00000000-0000-4000-8000-0000000000c1', email: 'coach@e2e.test', fullName: 'Coach Test' }
export const ATHLETE: MockUser = { id: '00000000-0000-4000-8000-0000000000a1', email: 'zoe@e2e.test', fullName: 'Zoé Gagnon' }
const ADMIN_ID = '00000000-0000-4000-8000-0000000000ad'

export const CLASS_ID = 'c1a55000-0000-4000-8000-000000000001'
export const FRAN_ID = 'f2a00000-0000-4000-8000-000000000001'
export const PLAN_ID = 'b1a00000-0000-4000-8000-000000000001'

const muscle = (key: string) => [{ muscle_group_id: `mg-${key}`, role: 'primary', muscle_groups: { name_key: key } }]
const exercise = (id: string, name: string, category: string, region: string, key: string, equipment: string[]): Row => ({
  id, name, description: '', category, body_region: region, movement_type: null, secondary_movements: [], video_url: null, video_path: null,
  center_id: null, origin_center_id: null, review_status: null, level: null, equipment, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  exercise_muscles: muscle(key), exercise_methods: []
})
export const EXERCISES: Row[] = [
  exercise('e0000000-0000-4000-8000-000000000001', 'Back squat', 'strength', 'lower', 'quads', ['barbell', 'plates', 'rack']),
  exercise('e0000000-0000-4000-8000-000000000002', 'Thruster', 'olympic', 'full', 'quads', ['barbell', 'plates']),
  exercise('e0000000-0000-4000-8000-000000000003', 'Traction (pull-up)', 'gymnastics', 'upper', 'back', ['pullup_bar']),
  exercise('e0000000-0000-4000-8000-000000000004', 'Développé militaire', 'strength', 'upper', 'shoulders', ['barbell', 'plates'])
]
const [, THRUSTER, PULLUP] = EXERCISES

const FRAN_LINES: Row[] = [
  { workout_id: FRAN_ID, position: 1, sets: null, reps: '21-15-9', weight: '43 kg / 30 kg', rest_seconds: null, notes: null, exercise_id: THRUSTER.id, exercises: { name: THRUSTER.name } },
  { workout_id: FRAN_ID, position: 2, sets: null, reps: '21-15-9', weight: null, rest_seconds: null, notes: null, exercise_id: PULLUP.id, exercises: { name: PULLUP.name } }
]
export const FRAN: Row = {
  id: FRAN_ID, title: 'Fran', method: 'for_time', duration_minutes: null, notes: '21-15-9, chronométré.', created_by: ADMIN_ID,
  is_benchmark: true, created_at: '2026-11-12T00:00:00Z', workout_exercises: FRAN_LINES
}

export const ATHLETES = [
  { id: ATHLETE.id, name: ATHLETE.fullName },
  { id: '00000000-0000-4000-8000-0000000000a2', name: 'Alex Tremblay' },
  { id: '00000000-0000-4000-8000-0000000000a3', name: 'Marc Roy' }
]

const CLASS = (coachId: string): Row => ({ id: CLASS_ID, name: 'CrossFit 6h', description: null, schedule: null, coach_id: coachId, invite_token: 'e2e-invite', created_at: '2026-01-01T00:00:00Z', center_id: null })

/** La base vue par le coach. */
export function coachDb(extra: { tables?: Record<string, Row[]> } = {}): MockSupabase {
  return new MockSupabase(COACH, {
    tables: {
      profiles: [{ id: COACH.id, role: 'center', full_name: COACH.fullName, avatar_url: null }],
      admin_users: [],
      classes: [CLASS(COACH.id)],
      class_members: ATHLETES.map((a, i) => ({ class_id: CLASS_ID, athlete_id: a.id, joined_at: `2026-01-0${i + 2}T00:00:00Z`, profile: { full_name: a.name } })),
      class_slots: [1, 3, 5].map((weekday) => ({ id: `slot-${weekday}`, class_id: CLASS_ID, weekday, start_time: '06:00:00', duration_minutes: 60 })),
      exercises: EXERCISES,
      workouts: [FRAN],
      workout_exercises: FRAN_LINES,
      class_plans: [{ id: PLAN_ID, class_id: CLASS_ID, coach_id: COACH.id, scheduled_date: TODAY, title: null, notes: 'Cap 10 min.', workout_id: FRAN_ID, workouts: { title: 'Fran' }, scheduled_workouts: [] }],
      class_attendance: [{ id: 'att-1', class_id: CLASS_ID, user_id: ATHLETES[1].id, session_date: TODAY, method: 'qr', checked_in_at: NOW.toISOString() }],
      ...extra.tables
    },
    rpc: {
      get_class_followup: () => ATHLETES.map((a, i) => ({ athlete_id: a.id, full_name: a.name, avatar_url: null, joined_at: '2026-01-02', last_session_at: i === 2 ? null : NOW.toISOString(), sessions_7d: 1, minutes_7d: 40, sessions_30d: 4, minutes_30d: 160, current_streak: 1 })),
      open_checkin: () => [{ code: 'e2e0c0de0e2e0c0de0e2e0c0de0e2e0c', expires_at: new Date(NOW.getTime() + 3 * 3600e3).toISOString() }],
      get_whiteboard: () => [
        { score_id: 's1', athlete_id: ATHLETES[1].id, full_name: 'Alex Tremblay', avatar_url: null, score_type: 'time', seconds: 272, rounds: null, reps: null, load_kg: null, capped: false, rx: 'rx', note: null, performed_at: NOW.toISOString(), reactions: 2, my_reaction: null },
        { score_id: 's2', athlete_id: ATHLETES[2].id, full_name: 'Marc Roy', avatar_url: null, score_type: 'time', seconds: 251, rounds: null, reps: null, load_kg: null, capped: false, rx: 'scaled', note: null, performed_at: NOW.toISOString(), reactions: 0, my_reaction: null }
      ]
    }
  })
}

/** La base vue par une athlète membre du cours. */
export function athleteDb(init: { signedIn?: boolean; checkIn?: string } = {}): MockSupabase {
  return new MockSupabase(ATHLETE, {
    signedIn: init.signedIn ?? true,
    tables: {
      profiles: [{ id: ATHLETE.id, role: 'member', full_name: ATHLETE.fullName, avatar_url: null }],
      admin_users: [],
      classes: [CLASS('00000000-0000-4000-8000-0000000000c9')],
      class_members: [{ class_id: CLASS_ID, athlete_id: ATHLETE.id, joined_at: '2026-01-02T00:00:00Z', classes: CLASS('00000000-0000-4000-8000-0000000000c9') }],
      class_slots: [1, 3, 5].map((weekday) => ({ id: `slot-${weekday}`, class_id: CLASS_ID, weekday, start_time: '06:00:00', duration_minutes: 60 })),
      class_attendance: [],
      exercises: EXERCISES
    },
    rpc: { check_in: () => init.checkIn ?? 'ok' }
  })
}

/**
 * Chaque test : heure figée (le mercredi matin) et relevé des erreurs de la
 * page, qui font échouer le test.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.clock.setFixedTime(NOW)
    await use(errors)
    expect(errors, 'erreurs JavaScript dans la page').toEqual([])
  }, { auto: true }]
})
export { expect }
