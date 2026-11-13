import { test, expect, coachDb, CLASS_ID, FRAN_ID, TODAY, day } from './fixtures'

/** Parcours 3 : programmer la semaine d'un cours (2.2), puis un cycle (2.3). */
test('le coach programme vendredi, puis un cycle de deux semaines', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto(`/dashboard/classes?c=${CLASS_ID}&tab=planning`)

  // Horaire lun-mer-ven : vendredi 20 n'a pas encore de WOD.
  await expect(page.locator('.wb-week-unplanned')).toContainText('ven. 20')

  await page.getByRole('button', { name: /Programmer un WOD le vendredi 20 novembre/i }).click()
  await page.locator('#week-picker-search').fill('Fran')
  await page.getByRole('option', { name: /Fran/ }).click()
  await page.getByRole('button', { name: 'Programmer pour le cours' }).click()

  await expect(page.locator('.wb-week-unplanned')).toHaveCount(0)
  expect(db.writesTo('class_plans', 'POST')).toEqual([expect.objectContaining({ class_id: CLASS_ID, scheduled_date: day(2), workout_id: FRAN_ID })])

  // Cycle : Fran sur deux semaines, la charge monte (+10 % bas du corps, arrondi aux disques).
  await page.getByRole('button', { name: 'Créer un cycle' }).click()
  await page.locator('#cycle-search').fill('Fran')
  await page.locator('.wb-cycle').getByRole('option', { name: /Fran/ }).click()
  await page.locator('#cycle-weeks').selectOption('2')
  await expect(page.locator('.wb-cycle-week')).toHaveCount(2)
  await expect(page.locator('.wb-cycle-week').nth(1)).toContainText('47.5 kg / 32.5 kg')
  await page.getByRole('button', { name: 'Créer le cycle (2 semaines)' }).click()

  await expect(page.getByRole('status')).toContainText('Cycle créé : 2 séances programmées.')
  const [copy] = db.writesTo('workouts', 'POST')
  expect(copy).toMatchObject({ title: 'Fran · S2/2', method: 'for_time' })
  expect(db.writesTo('workout_exercises', 'POST').map((l) => l.weight)).toEqual(['47.5 kg / 32.5 kg', null])
  const plans = db.writesTo('class_plans', 'POST').slice(1)
  expect(plans.map((p) => [p.scheduled_date, p.workout_id])).toEqual([[TODAY, FRAN_ID], [day(7), copy.id]])
})

/** Vue liste du planning (4.2) : le ✕ dit ce qu'il retire, arme puis confirme. */
test('le coach retire une séance depuis la liste, en deux temps', async ({ page }) => {
  const db = coachDb()
  db.table('class_plans').push({ id: 'p-ven', class_id: CLASS_ID, coach_id: 'x', scheduled_date: day(2), title: 'Force du vendredi', notes: null, workout_id: null, workouts: null, scheduled_workouts: [] })
  await db.install(page)
  await page.goto(`/dashboard/classes?c=${CLASS_ID}&tab=planning`)
  await page.getByRole('button', { name: 'Liste' }).click()

  const remove = page.getByRole('button', { name: 'Retirer pour tout le cours — Force du vendredi' })
  await remove.click()
  // Armé : le bouton passe au rouge (classe is-armed, plus de style en ligne).
  const confirm = page.getByRole('button', { name: 'Confirmer' })
  await expect(confirm).toHaveCSS('background-color', 'rgb(239, 68, 68)')
  await confirm.click()
  await expect(page.getByText('Force du vendredi')).toHaveCount(0)
  expect(db.writesTo('class_plans', 'DELETE').map((p) => p.id)).toEqual(['p-ven'])
})
