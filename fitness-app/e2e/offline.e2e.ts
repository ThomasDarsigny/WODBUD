import { test, expect, athleteDb, ATHLETE, EXERCISES, FRAN, FRAN_ID, PLAN_ID, TODAY } from './fixtures'

/**
 * Séance au sous-sol (A5) : le WOD du jour a été vu à l'accueil avec du
 * réseau ; il n'y en a plus au moment de commencer.
 */
const [, THRUSTER, PULLUP] = EXERCISES

function dbWithTodayWod() {
  const db = athleteDb()
  db.tables.workouts = [FRAN]
  db.tables.workout_exercises = [
    { id: 'we-1', workout_id: FRAN_ID, exercise_id: THRUSTER.id, position: 1, sets: null, reps: '21-15-9', weight: '43 kg / 30 kg', rest_seconds: null, exercises: { name: THRUSTER.name } },
    { id: 'we-2', workout_id: FRAN_ID, exercise_id: PULLUP.id, position: 2, sets: null, reps: '21-15-9', weight: null, rest_seconds: null, exercises: { name: PULLUP.name } }
  ]
  db.tables.scheduled_workouts = [{
    id: 'sw-1', user_id: ATHLETE.id, scheduled_date: TODAY, title: null, notes: 'Cap 10 min.', workout_id: FRAN_ID, session_id: null,
    class_plan_id: PLAN_ID, workouts: { title: 'Fran' }, class_plans: { classes: { name: 'CrossFit 6h' } }
  }]
  return db
}

test('le WOD du jour démarre sans réseau, avec ses mouvements, sans attendre', async ({ page }) => {
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/athlete')
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible()

  // Lu à l'avance pendant qu'il y avait du réseau.
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`wodbud_offline:pack:${id}`), FRAN_ID)).not.toBeNull()

  // Au sous-sol : l'app est rouverte sans réseau.
  db.offline = true
  await page.goto('/athlete')
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible({ timeout: 3000 })
  await page.getByRole('button', { name: /Faire ce WOD/ }).click()

  await expect(page).toHaveURL(/\/athlete\/session/)
  // Moins que les 7 s des nouveaux essais de supabase-js : le contenu gardé passe d'abord.
  await expect(page.locator('.wb-run-name')).toHaveText([String(THRUSTER.name), String(PULLUP.name)], { timeout: 3000 })
})

test('sans contenu gardé, la séance le dit au lieu d’une erreur brute', async ({ page }) => {
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/athlete')
  await expect(page.getByRole('heading', { name: 'Fran' })).toBeVisible()
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`wodbud_offline:pack:${id}`), FRAN_ID)).not.toBeNull()

  // Le contenu a disparu (autre téléphone, stockage vidé) et le réseau aussi.
  await page.evaluate((id) => localStorage.removeItem(`wodbud_offline:pack:${id}`), FRAN_ID)
  db.offline = true

  await page.getByRole('button', { name: /Faire ce WOD/ }).click()

  // Après les nouveaux essais de supabase-js (1 s, 2 s, 4 s).
  await expect(page.getByText(/ce WOD n'a pas encore été ouvert sur ce téléphone/)).toBeVisible({ timeout: 15000 })

})

test('app des boutiques : les lectures gardées dans le vrai Cache Storage du navigateur', async ({ page }) => {
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/login')
  const read = (module: string) => page.evaluate(async (path) => {
    const { createCachedFetch } = await import(/* @vite-ignore */ path)
    const f = createCachedFetch({ restPrefix: 'http://supabase.test/rest/v1/', caches })
    // Jeton factice du compte « u1 » (seul le champ sub est lu).
    const headers = { apikey: 'test', Authorization: 'Bearer e30.eyJzdWIiOiJ1MSJ9.x', Accept: 'application/json' }
    const res = await f('http://supabase.test/rest/v1/workouts?select=id,title', { headers })
    return { status: res.status, body: await res.json(), caches: await caches.keys() }
  }, module)

  const online = await read('/src/lib/restCache.ts')
  expect(online.body).toEqual([expect.objectContaining({ id: FRAN_ID, title: 'Fran' })])
  expect(online.caches).toContain('wodbud-rest-v1:u1')

  db.offline = true
  const offline = await read('/src/lib/restCache.ts')
  expect(offline).toEqual(online)

  await page.evaluate(async (path) => { const { clearRestCache } = await import(/* @vite-ignore */ path); await clearRestCache(caches) }, '/src/lib/restCache.ts')
  expect(await page.evaluate(() => caches.keys())).not.toContain('wodbud-rest-v1:u1')
})

test('la déconnexion efface ce qui était gardé pour le hors-ligne', async ({ page }) => {
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/athlete')
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`wodbud_offline:pack:${id}`), FRAN_ID)).not.toBeNull()
  expect(await page.evaluate((id) => localStorage.getItem(`wodbud_offline:upcoming:${id}`), ATHLETE.id)).not.toBeNull()

  await page.goto('/athlete/settings')
  await page.getByRole('button', { name: /Se déconnecter|Déconnexion/ }).first().click()
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('wodbud_offline:')).length)).toBe(0)
})
