import { test, expect, athleteDb, ATHLETE, EXERCISES, FRAN, FRAN_ID, PLAN_ID, TODAY } from './fixtures'

/**
 * Séance (constat 06 de l'audit) : le chrono et le prochain mouvement
 * d'abord ; « Terminer » devant, « Pause » à côté, « Abandonner » à part et
 * en deux temps ; sur téléphone, le mode salle s'ouvre seul au départ.
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
    id: 'sw-1', user_id: ATHLETE.id, scheduled_date: TODAY, title: null, notes: null, workout_id: FRAN_ID, session_id: null,
    class_plan_id: PLAN_ID, workouts: { title: 'Fran' }, class_plans: { classes: { name: 'CrossFit 6h' } }
  }]
  return db
}

test('ordinateur : prochain mouvement sous le chrono, « Fait » passe au suivant ; abandon en deux temps', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Le téléphone ouvre le mode salle : parcours suivant.')
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/athlete')
  await page.getByRole('button', { name: /Faire ce WOD/ }).click()
  await expect(page).toHaveURL(/\/athlete\/session/)

  await expect(page.getByRole('dialog', { name: 'Mode salle' })).toHaveCount(0)
  const next = page.locator('.wb-next--card')
  await expect(next.locator('.wb-next-name')).toHaveText(String(THRUSTER.name))
  await expect(next.locator('.wb-next-detail')).toHaveText('21-15-9 · 43 kg / 30 kg')
  await expect(next.locator('.wb-next-label span')).toHaveText('1/2')
  await next.getByRole('button', { name: `Fait — ${THRUSTER.name}` }).click()
  await expect(next.locator('.wb-next-name')).toHaveText(String(PULLUP.name))
  await next.getByRole('button', { name: `Fait — ${PULLUP.name}` }).click()
  await expect(page.locator('.wb-next--card')).toHaveText('✓ Tous les mouvements sont faits.')

  // « Terminer » est l'action principale ; « Abandonner » demande confirmation.
  await expect(page.getByRole('button', { name: /Terminer la séance/ })).toHaveClass(/wb-btn--primary/)
  const discard = page.getByRole('button', { name: 'Abandonner' })
  await discard.click()
  await expect(page.getByRole('button', { name: 'Confirmer l’abandon' }).or(page.getByRole('button', { name: "Confirmer l'abandon" }))).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Le temps écoulé sera perdu.' })).toBeVisible()
})

test('téléphone : le mode salle s’ouvre au départ, montre le prochain mouvement, et termine la séance', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Sur ordinateur, le mode salle reste à la demande.')
  const db = dbWithTodayWod()
  await db.install(page)
  await page.goto('/athlete')
  await page.getByRole('button', { name: /Faire ce WOD/ }).click()

  const gym = page.getByRole('dialog', { name: 'Mode salle' })
  await expect(gym).toBeVisible()
  await expect(gym.locator('.wb-gym-clock')).toBeVisible()
  await expect(gym.locator('.wb-next-name')).toHaveText(String(THRUSTER.name))
  await expect(gym.getByRole('button', { name: /Terminer la séance/ })).toHaveCount(0)

  await gym.getByRole('button', { name: `Fait — ${THRUSTER.name}` }).click()
  await gym.getByRole('button', { name: `Fait — ${PULLUP.name}` }).click()
  await expect(gym.locator('.wb-next')).toHaveText('✓ Tous les mouvements sont faits.')

  await gym.getByRole('button', { name: /Terminer la séance/ }).click()
  await expect(gym).toHaveCount(0)
  await expect.poll(() => db.writesTo('workout_sessions', 'POST').length).toBe(1)
})
