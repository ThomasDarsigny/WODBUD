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
