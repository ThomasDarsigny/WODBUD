import { test, expect, coachDb, COACH } from './fixtures'

/** Administration : la déconnexion est dans l'en-tête, là où l'admin arrive. */

test('l’administration se déconnecte depuis son en-tête', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  await db.install(page)
  await page.goto('/dashboard/admin')

  await page.getByRole('button', { name: 'Déconnexion' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(db.authCalls.some((c) => c.path === '/auth/v1/logout')).toBe(true)
})
