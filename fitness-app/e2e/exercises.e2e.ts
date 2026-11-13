import { test, expect, coachDb, COACH } from './fixtures'

/** Bibliothèque d'exercices (4.2) : formulaire et fiche sont de vraies fenêtres, accessibles au clavier. */
test('le formulaire d’exercice : champs étiquetés, choix annoncés, Échap pour fermer', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  await db.install(page)
  await page.goto('/dashboard/exercises')

  await page.getByRole('button', { name: /Nouvel exercice/i }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Nouvel exercice' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel(/Nom de l.exercice/i).fill('Rameur')

  const movement = dialog.getByRole('group', { name: /Type de mouvement/i })
  const pull = movement.getByRole('button', { name: 'Tirer' })
  await pull.click()
  await expect(pull).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(db.writesTo('exercises', 'POST')).toEqual([])
})

test('la fiche d’exercice demande confirmation avant de supprimer', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  await db.install(page)
  await page.goto('/dashboard/exercises')

  await page.getByText('Back squat', { exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Back squat' })
  const del = dialog.getByRole('button', { name: 'Supprimer', exact: true })
  await del.click()
  await expect(del).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByRole('alert')).toContainText('irréversible')
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  expect(db.writesTo('exercises', 'DELETE')).toEqual([])
})
