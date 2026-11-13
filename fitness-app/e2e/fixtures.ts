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

/** Deux rangs : bronze dès 120 min, argent à 600 (leur couleur passe par --rank). */
const rank = (position: number, key: string, fr: string, min: number, color: string, motto: string | null = null) => ({ position, key, display_fr: fr, display_en: fr, display_es: fr, min_minutes: min, color, motto_fr: motto, motto_en: motto, motto_es: motto })
export const RANKS = [rank(1, 'bronze', 'Bronze', 120, '#cd7f32', 'Chaque séance compte.'), rank(2, 'argent', 'Argent', 600, '#c0c0c0')]

export const COMMUNITY_ID = 'c0aa0000-0000-4000-8000-000000000001'

/** Une communauté dont le coach est propriétaire : membres, fil, défis, classement, WOD épinglé. */
export function communityDb(): MockSupabase {
  const db = coachDb()
  const people = [{ id: COACH.id, name: COACH.fullName }, ...ATHLETES.map((a) => ({ id: a.id, name: a.name }))]
  db.tables.communities = [
    { id: COMMUNITY_ID, name: 'Club des 6 h', description: 'Ceux qui s’entraînent avant le lever du soleil.', created_by: COACH.id, created_at: '2026-10-01T00:00:00Z', community_members: [{ count: people.length }] },
    { id: 'c0aa0000-0000-4000-8000-000000000002', name: 'Coureurs du dimanche', description: null, created_by: 'x', created_at: '2026-09-01T00:00:00Z', community_members: [{ count: 12 }] }
  ]
  db.tables.community_members = people.map((p) => ({ community_id: COMMUNITY_ID, user_id: p.id }))
  db.tables.community_challenges = [{ id: 'ch1', community_id: COMMUNITY_ID }, { id: 'ch2', community_id: COMMUNITY_ID }]
  db.tables.ranks = RANKS.map((r) => ({ ...r }))
  db.rpc.get_community_members = () => people.map((p, i) => ({
    user_id: p.id, display_name: p.name, avatar_url: null, joined_at: `2026-10-0${i + 1}T00:00:00Z`, is_me: p.id === COACH.id,
    share_rank: i !== 3, rank_key: i === 3 ? null : 'bronze', total_minutes: i === 3 ? null : 300 - i * 40, current_streak: i === 3 ? null : 3 - (i % 3), badges: i === 3 ? null : 2,
    role: p.id === COACH.id ? 'admin' : 'member', is_owner: p.id === COACH.id
  }))
  db.rpc.get_community_challenges = () => [
    { id: 'ch1', title: '1 000 minutes en novembre', target_minutes: 1000, starts_on: '2026-11-01', ends_on: '2026-11-30', progress_minutes: 640, contributors: 4 },
    { id: 'ch2', title: 'Sprint d’octobre', target_minutes: 500, starts_on: '2026-10-01', ends_on: '2026-10-31', progress_minutes: 520, contributors: 3 }
  ]
  db.rpc.get_community_leaderboard_since = () => people.slice(0, 3).map((p, i) => ({ user_id: p.id, display_name: p.name, avatar_url: null, minutes: 180 - i * 45, is_me: p.id === COACH.id }))
  db.rpc.get_community_wod = () => [{ id: 'cw1', workout_id: FRAN_ID, title: 'Fran', note: 'Le benchmark du mois : notez vos temps.', pinned_at: '2026-11-10T00:00:00Z', done_by: [{ user_id: ATHLETES[1].id, display_name: 'Alex Tremblay', avatar_url: null, minutes: 6 }], i_did: false }]
  db.rpc.get_community_feed = () => [
    { event_key: 'session:1', kind: 'session', at: new Date(NOW.getTime() - 2 * 3600e3).toISOString(), user_id: ATHLETES[1].id, display_name: 'Alex Tremblay', avatar_url: null, is_me: false, title: 'Fran', minutes: 12, badge_key: null, rank_key: null, fire: 2, muscle: 0, clap: 1, my_reactions: ['fire'] },
    { event_key: 'rank:1', kind: 'rank', at: new Date(NOW.getTime() - 26 * 3600e3).toISOString(), user_id: ATHLETES[0].id, display_name: ATHLETE.fullName, avatar_url: null, is_me: false, title: null, minutes: null, badge_key: null, rank_key: 'bronze', fire: 0, muscle: 3, clap: 0, my_reactions: [] }
  ]
  db.rpc.get_community_member_profile = (args) => {
    const p = people.find((x) => x.id === args.p_user) ?? people[1]
    return [{ user_id: p.id, display_name: p.name, avatar_url: null, role: p.id === COACH.id ? 'admin' : 'member', is_owner: p.id === COACH.id, visible: true, rank_key: 'bronze', total_minutes: 260, current_streak: 2, longest_streak: 9, social_links: [{ platform: 'instagram', url: 'https://instagram.com/alex.test' }], badges: [{ key: 'first_session', unlocked_at: '2026-10-02T00:00:00Z' }] }]
  }
  return db
}

/** Thématiques proposées à tous : une choisie par le compte courant, une ajoutée. */
export const FEATURE_TOPICS = [
  { id: 't1', title: 'Suivi du sommeil', description: 'Noter ses heures de sommeil à côté des séances.', status: 'open', created_at: '2026-10-01T00:00:00Z', votes: 3, is_mine: true },
  { id: 't2', title: 'Minuterie EMOM', description: null, status: 'open', created_at: '2026-10-02T00:00:00Z', votes: 1, is_mine: false },
  { id: 't3', title: 'Mode hors ligne', description: null, status: 'done', created_at: '2026-09-01T00:00:00Z', votes: 4, is_mine: false }
]

/** Votes du coach : un vote ouvert avec résultats, un vote fermé sans vote ; les thématiques. */
export function voteDb(): MockSupabase {
  const db = coachDb()
  db.tables.vote_sessions = [
    { id: 'vs-open', class_id: CLASS_ID, coach_id: COACH.id, title: 'Mouvement de vendredi', status: 'open', deadline: '2026-11-20T23:00:00Z', exercise_options: [], created_at: '2026-11-17T00:00:00Z' },
    { id: 'vs-closed', class_id: CLASS_ID, coach_id: COACH.id, title: 'Finisher de lundi', status: 'closed', deadline: null, exercise_options: [], created_at: '2026-11-10T00:00:00Z' }
  ]
  db.tables.vote_results = [
    { vote_session_id: 'vs-open', vote_option_id: 'o1', position: 1, label: 'Back squat', color: '#34d399', exercise_id: EXERCISES[0].id, votes: 3, percentage: '60.0', is_leading: true },
    { vote_session_id: 'vs-open', vote_option_id: 'o2', position: 2, label: 'Thruster', color: '#38bdf8', exercise_id: EXERCISES[1].id, votes: 2, percentage: '40.0', is_leading: false }
  ]
  db.rpc.get_feature_topics = () => FEATURE_TOPICS.map((t) => ({ ...t }))
  return db
}
