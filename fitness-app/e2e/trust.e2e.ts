import { test, expect, coachDb } from './fixtures'

/** Petites ruptures de confiance (constat 13 de l'audit). */

test('adresse inconnue : « Page introuvable », et non un retour muet à l’accueil', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  await db.install(page)
  await page.goto('/athlete/cette-page-n-existe-pas')

  await expect(page).toHaveURL(/\/athlete\/cette-page-n-existe-pas$/)
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  await page.getByRole('link', { name: 'Retour à l’accueil' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('landing : un visiteur voit « Connexion », un compte ouvert « Mon espace »', async ({ page }) => {
  const visitor = coachDb()
  visitor.signedIn = false
  await visitor.install(page)
  await page.goto('/centres')
  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: 'Connexion' })).toBeVisible()
  await expect(nav.getByRole('link', { name: /dashboard/i })).toHaveCount(0)
})

test('landing : un compte déjà ouvert va à « Mon espace »', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/centres')
  const nav = page.getByRole('navigation').first()
  await expect(nav.getByRole('link', { name: 'Mon espace' })).toBeVisible()
})
