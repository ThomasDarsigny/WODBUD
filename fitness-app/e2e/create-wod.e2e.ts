import { test, expect, coachDb, EXERCISES } from './fixtures'

/** Parcours 2 : créer un WOD dans le créateur en un écran (2.1) et l'enregistrer. */
test('le coach crée un WOD et l’enregistre', async ({ page, isMobile }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/workout')

  // « + » direct sur la ligne d'un exercice.
  await page.getByRole('searchbox').first().fill('squat')
  // Mise en page de la ligne : « + » à droite du nom, sur la même ligne
  // (une collision de classes CSS l'avait fait passer dessous sans casser le clic).
  const row = page.locator('.wb-pick').filter({ hasText: 'Back squat' })
  const nameBox = await row.locator('.wb-pick-main').boundingBox()
  const addBox = await row.getByRole('button', { name: 'Ajouter Back squat au WOD' }).boundingBox()
  expect(addBox!.x).toBeGreaterThanOrEqual(nameBox!.x + nameBox!.width - 1)
  expect(Math.abs(addBox!.y + addBox!.height / 2 - (nameBox!.y + nameBox!.height / 2))).toBeLessThan(30)
  await page.getByRole('button', { name: 'Ajouter Back squat au WOD' }).click()
  await page.getByRole('searchbox').first().fill('militaire')
  await page.getByRole('button', { name: 'Ajouter Développé militaire au WOD' }).click()

  // Sur téléphone, le tiroir « N exercices dans le WOD » ouvre le WOD.
  if (isMobile) await page.locator('.wb-builder-tray').click()

  await page.locator('#builder-name').fill('Force du mercredi')
  await page.getByRole('button', { name: /Sauvegarder la séance/i }).click()
  await expect(page.getByRole('button', { name: /Enregistré/i })).toBeVisible()

  const [workout] = db.writesTo('workouts', 'POST')
  expect(workout).toMatchObject({ title: 'Force du mercredi' })
  const lines = db.writesTo('workout_exercises', 'POST')
  expect(lines.map((l) => l.exercise_id)).toEqual([EXERCISES[0].id, EXERCISES[3].id])
  expect(lines.every((l) => l.workout_id === workout.id)).toBe(true)
})
