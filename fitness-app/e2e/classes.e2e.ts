import { test, expect, coachDb, COACH } from './fixtures'

/** Fenêtre de création d'un cours (composant Modal partagé, 4.2) : accessible au clavier, et le cours est créé. */
test('le coach crée un cours depuis la fenêtre « Créer un cours »', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/classes?new=1')

  const dialog = page.getByRole('dialog', { name: 'Créer un cours' })
  await expect(dialog).toBeVisible()
  // Le champ obligatoire est relié à son étiquette et reçoit le focus.
  const name = dialog.getByLabel(/Nom du cours/i)
  await expect(name).toBeFocused()

  // Échap ferme la fenêtre ; on la rouvre depuis la liste.
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: /Créer un cours/i }).click()
  await expect(dialog).toBeVisible()

  await dialog.getByLabel(/Nom du cours/i).fill('Haltéro du samedi')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Haltéro du samedi')
  expect(db.writesTo('classes', 'POST')).toEqual([expect.objectContaining({ name: 'Haltéro du samedi', coach_id: COACH.id })])
})
