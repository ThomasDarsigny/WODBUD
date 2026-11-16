import { test, expect, coachDb, COACH } from './fixtures'

/** Parcours 1 : connexion, puis l'accueil du coach centré sur la salle (3.5). */
test('le coach se connecte et voit la salle du jour', async ({ page, isMobile }) => {
  const db = coachDb()
  db.signedIn = false
  await db.install(page)

  await page.goto('/login')
  await page.getByLabel(/courriel|e-mail|email/i).fill(COACH.email)
  await page.getByLabel(/mot de passe/i).fill('mot-de-passe-de-test')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/dashboard\/today$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Coach|Salut/i)

  // Aujourd'hui à la salle : le cours de 6 h, Fran, un présent.
  const card = page.locator('.wb-floor-card').filter({ hasText: 'CrossFit 6h' })
  await expect(card).toContainText('6 h')
  await expect(card).toContainText('Fran')
  await expect(card).toContainText('1 présent')
  await expect(card.getByRole('link', { name: 'Tableau blanc' })).toHaveAttribute('href', /\/dashboard\/whiteboard\//)

  // À faire : vendredi et lundi n'ont pas de WOD ; un membre est à relancer.
  const todo = page.locator('section').filter({ has: page.getByRole('heading', { name: 'À faire' }) })
  await expect(todo).toContainText('2 jours sans WOD')
  await expect(todo).toContainText('1 membre à relancer')

  // Le menu : cinq entrées, « Aujourd'hui » allumée.
  if (isMobile) {
    await expect(page.locator('.wb-tabbar')).toContainText('Groupes')
  } else {
    const menu = page.getByRole('navigation', { name: /navigation principale/i })
    await expect(menu.getByRole('link')).toHaveText([/Aujourd/i, /Groupes/i, /Programmer/i, /Mon entraînement/i, /Plus/i])
  }
})

/** Parcours de l'audit, étape 3 : qui dirige un centre a « Invite ton équipe » dans ses premiers pas. */
test('premiers pas : « Invite ton équipe » pour le propriétaire d’un centre, cochée dès qu’un lien existe', async ({ page }) => {
  const center = { id: 'ce000000-0000-4000-8000-000000000001', name: 'Box Limoilou', owner_id: COACH.id, equipment: [], venue: 'box', group_size: '11-30' }
  const db = coachDb({ tables: {
    centers: [center],
    center_members: [{ center_id: center.id, user_id: COACH.id, role: 'owner', joined_at: '2026-01-01T00:00:00Z', centers: center }],
    center_invites: []
  } })
  await db.install(page)
  await page.goto('/dashboard/today')

  const step = page.getByRole('link', { name: /Invite ton équipe/ })
  await expect(step).toHaveAttribute('href', '/dashboard/settings#equipe')

  db.table('center_invites').push({ token: 'abc', center_id: center.id, role: 'member', created_by: COACH.id })
  await page.reload()
  await expect(page.locator('.wb-onb-step.is-done').filter({ hasText: 'Invite ton équipe' })).toBeVisible()
})
