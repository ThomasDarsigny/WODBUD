import { test, expect, coachDb, COACH, TODAY, day } from './fixtures'

/** Journal (4.2) : programmer une séance dans un vrai formulaire, retirer une séance nommée. */
test('journal : programmer une séance, puis en retirer une en deux temps', async ({ page }) => {
  const db = coachDb()
  db.tables.scheduled_workouts = [
    { id: 'sw1', user_id: COACH.id, scheduled_date: TODAY, title: 'Course 5 km', notes: null, workout_id: null, session_id: null, class_plan_id: null, workouts: null, class_plans: null }
  ]
  await db.install(page)
  await page.goto('/dashboard/journal')
  await expect(page.getByText('Course 5 km')).toBeVisible()

  await page.getByRole('button', { name: /Programmer une séance/ }).click()
  await page.getByLabel(/^Date/).fill(day(3))
  const title = page.getByLabel('Titre (optionnel)')
  await title.fill('Mobilité')
  // Entrée dans un champ envoie le formulaire, comme partout ailleurs.
  await title.press('Enter')
  await expect.poll(() => db.writesTo('scheduled_workouts', 'POST')).toEqual([expect.objectContaining({ scheduled_date: day(3), title: 'Mobilité', workout_id: null })])

  await page.getByRole('button', { name: 'Retirer — Course 5 km' }).click()
  await page.getByRole('button', { name: 'Confirmer' }).click()
  await expect.poll(() => db.writesTo('scheduled_workouts', 'DELETE').map((r) => r.id)).toEqual(['sw1'])
})
