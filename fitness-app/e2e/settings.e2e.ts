import { test, expect, coachDb, COACH } from './fixtures'

/** Paramètres (4.2) : champs reliés à leurs étiquettes, et suppression de compte gardée par le mot à taper. */
test('le coach change son nom ; la suppression du compte reste verrouillée tant que le mot n’est pas tapé', async ({ page }) => {
  const db = coachDb()
  db.tables.profiles = [{ id: COACH.id, role: 'center', full_name: 'Coach Test', avatar_url: null, theme_pref: 'dark', language: 'fr', social_links: [] }]
  await db.install(page)
  // Aperçu de la suppression (fonction Edge) : rien n'est supprimé ici.
  await page.route('**/functions/v1/delete-account', (r) => r.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    contentType: 'application/json',
    body: JSON.stringify({ impact: { workoutsCreated: 3, sessionsLogged: 12, classesOwned: 1, votesSessionsOwned: 0, scheduledCount: 2, communitiesOwned: 0, athletesAffected: 3, communityMembersAffected: 0 } })
  }))
  await page.goto('/dashboard/settings')

  const name = page.getByLabel('Nom affiché')
  await expect(name).toHaveValue('Coach Test')
  await name.fill('Coach Martin')
  await page.locator('.wb-set-row').filter({ has: name }).getByRole('button', { name: 'Enregistrer' }).click()
  await expect.poll(() => db.writesTo('profiles', 'PATCH').map((r) => r.full_name)).toContain('Coach Martin')

  await page.getByRole('button', { name: 'Supprimer mon compte' }).click()
  const dialog = page.getByRole('dialog', { name: 'Supprimer mon compte' })
  await expect(dialog).toContainText('3 athlètes')
  const confirm = dialog.getByRole('button', { name: 'Supprimer définitivement' })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel(/Tape SUPPRIMER pour confirmer/).fill('SUPPRIMER')
  await expect(confirm).toBeEnabled()

  // Échap ferme sans rien supprimer.
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(db.calls.filter((c) => c.fn.includes('delete'))).toEqual([])
})
