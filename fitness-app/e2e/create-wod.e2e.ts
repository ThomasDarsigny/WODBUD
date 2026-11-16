import { test, expect, coachDb, EXERCISES, NOW, CLASS_ID, TODAY } from './fixtures'

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

/** L'alerte de récupération 48 h (AlertDialog partagé, 4.2) : annuler au clavier, puis ajouter quand même. */
test('l’alerte 48 h demande une décision, au clavier comme à la souris', async ({ page }) => {
  const db = coachDb({ tables: {
    muscle_groups: [{ id: 'mg-quads', name_key: 'quads' }],
    exercise_muscles: [{ exercise_id: EXERCISES[0].id, muscle_group_id: 'mg-quads', role: 'primary' }]
  } })
  // Un WOD d'hier soir travaillait déjà les quadriceps.
  db.table('workouts').push({ id: 'w-hier', title: 'Jambes', method: 'strength', duration_minutes: 40, notes: null, created_by: 'x', is_benchmark: false, created_at: new Date(NOW.getTime() - 10 * 3600e3).toISOString() })
  db.table('workout_exercises').push({ workout_id: 'w-hier', exercise_id: EXERCISES[0].id, position: 1 })
  await db.install(page)
  await page.goto('/dashboard/workout')

  await page.getByRole('searchbox').first().fill('squat')
  const add = page.getByRole('button', { name: 'Ajouter Back squat au WOD' })
  await add.click()
  const alert = page.getByRole('alertdialog', { name: /Alerte récupération 48h/i })
  await expect(alert).toContainText('Quadriceps')
  await expect(alert.getByRole('button', { name: 'Annuler' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(alert).toHaveCount(0)
  await expect(add).toBeFocused()

  await add.click()
  await alert.getByRole('button', { name: 'Ajouter quand même' }).click()
  await expect(alert).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Back squat ajouté' })).toBeVisible()
})

/** La fiche d'exercice (4.2) : une vraie fenêtre, qui se ferme avec Échap et rend le focus à la ligne. */
test('la fiche d’un exercice se ferme avec Échap', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/workout')
  await page.getByRole('searchbox').first().fill('squat')
  const open = page.locator('.wb-pick').filter({ hasText: 'Back squat' }).locator('.wb-pick-open')
  await open.click()

  const dialog = page.getByRole('dialog', { name: 'Back squat' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Quadriceps')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
})

/** Constat 09 : filtres repliés ; « Équipement manquant » seulement quand l'équipement est connu. */
test('créateur : filtres repliés, pas d’« Équipement manquant » tant que l’équipement n’est pas renseigné', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/workout')

  await expect(page.locator('.wb-pick-name, .wb-picker-name, [class*="wb-pick"]').filter({ hasText: 'Thruster' }).first()).toBeVisible()
  await expect(page.locator('.wb-missing-equip')).toHaveCount(0)
  const toggle = page.locator('button[aria-controls="builder-filters"]')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(page.getByText('Équipement pas encore renseigné', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Seulement ce que j’ai' }).or(page.getByRole('button', { name: "Seulement ce que j'ai" }))).toHaveCount(0)
})

test('créateur : équipement renseigné, « Équipement manquant » sur ce qui en demande', async ({ page }) => {
  const db = coachDb()
  db.tables.profiles[0].equipment = ['pullup_bar']
  await db.install(page)
  await page.goto('/dashboard/workout')

  await expect(page.locator('.wb-missing-equip').first()).toBeVisible()
  await expect(page.locator('.wb-missing-equip').first()).toContainText('Équipement manquant')
})

/** Parcours de l'audit, étape 4 : après « Sauvegarder », programmer le WOD dans un cours sans changer de section. */
test('après l’enregistrement, le WOD se programme dans un cours, avec le garde-fou de volume', async ({ page, isMobile }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/workout')

  await page.getByRole('searchbox').first().fill('squat')
  await page.getByRole('button', { name: 'Ajouter Back squat au WOD' }).click()
  if (isMobile) await page.locator('.wb-builder-tray').click()
  await page.locator('#builder-name').fill('Force du jeudi')
  await page.getByRole('button', { name: /Sauvegarder la séance/i }).click()

  const panel = page.locator('.wb-schedwod')
  await expect(panel).toContainText('« Force du jeudi » est enregistré. Le programmer ?')
  // Le cours du coach, et le prochain jour de cours (mercredi 18, ce matin).
  await expect(panel.getByLabel('Où')).toHaveValue(CLASS_ID)
  await expect(panel.getByLabel('Quand')).toHaveValue(TODAY)

  // Jeudi : Fran (thrusters) est programmé mercredi, les quadriceps enchaîneraient.
  await panel.getByLabel('Quand').fill('2026-11-19')
  await expect(panel.locator('.wb-schedwod-warn')).toContainText('Quadriceps déjà travaillé')
  await panel.getByRole('button', { name: 'Programmer' }).click()

  await expect(panel).toContainText('« Force du jeudi » programmé')
  const [workout] = db.writesTo('workouts', 'POST')
  expect(db.writesTo('class_plans', 'POST')).toEqual([expect.objectContaining({ class_id: CLASS_ID, scheduled_date: '2026-11-19', workout_id: workout.id })])
  await expect(panel.getByRole('link', { name: 'Voir le planning' })).toHaveAttribute('href', `/dashboard/classes?c=${CLASS_ID}&tab=planning`)
})
