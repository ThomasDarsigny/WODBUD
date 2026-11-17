import { test, expect, coachDb, COACH, usageStats } from './fixtures'

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

/** Statistiques d'usage (074) : des totaux, sans service d'analyse externe. */
test('l’administration montre les statistiques d’usage', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  db.rpc.admin_usage_stats = () => usageStats()
  await db.install(page)
  await page.goto('/dashboard/admin')

  const usage = page.getByRole('region', { name: 'Statistiques d’usage' })
  await expect(usage.locator('.wb-stat', { hasText: 'Comptes actifs (7 jours)' })).toContainText('14')
  await expect(usage.locator('.wb-stat', { hasText: 'Présences (7 jours)' })).toContainText('52')
  await expect(usage.locator('.wb-stat', { hasText: 'WODs programmés (30 jours)' })).toContainText('31')
  // Plateformes : iPhone à zéro, même absent des données.
  await expect(usage.getByRole('listitem').filter({ hasText: 'Android' })).toHaveText('11 Android')
  await expect(usage.getByRole('listitem').filter({ hasText: 'iPhone' })).toHaveText('0 iPhone')
  // Les semaines, et la semaine en cours lisible au clavier.
  await expect(usage.getByRole('img', { name: /16 nov\. : 14 comptes actifs/ })).toBeVisible()
  // Par centre.
  const row = usage.getByRole('row', { name: /Box Limoilou/ })
  await expect(row.getByRole('cell')).toHaveText(['19', '12'])
  expect(db.calls.find((c) => c.fn === 'admin_usage_stats')?.args).toEqual({ p_weeks: 8 })
})

test('sans la fonction en base, les statistiques le disent sans planter', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  await db.install(page)
  await page.goto('/dashboard/admin')
  await expect(page.getByRole('region', { name: 'Statistiques d’usage' })).toContainText('Statistiques indisponibles pour l’instant.')
})

/** Une seule visite enregistrée par jour et par appareil, même après un rechargement. */
test('l’ouverture de l’app est comptée une fois par jour', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/today')
  await expect.poll(() => db.calls.filter((c) => c.fn === 'touch_usage').length).toBe(1)
  expect(db.calls.find((c) => c.fn === 'touch_usage')?.args).toEqual({ p_platform: 'web' })

  await page.reload()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.waitForLoadState('networkidle')
  expect(db.calls.filter((c) => c.fn === 'touch_usage').length).toBe(1)
})

test('sans session, rien n’est compté', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  await db.install(page)
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  expect(db.calls.some((c) => c.fn === 'touch_usage')).toBe(false)
})
