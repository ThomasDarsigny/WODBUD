import { test, expect, coachDb, athleteDb, ATHLETE, CLASS_ID, ATHLETES } from './fixtures'

/** Tendances sur 8 semaines (constat 08 de l'audit) : fréquentation d'un cours, minutes de l'athlète. */

test('suivi d’un cours : les présences des 8 dernières semaines, détail au survol et tableau des chiffres', async ({ page }) => {
  const db = coachDb()
  const at = (id: string, user: string, date: string) => ({ id, class_id: CLASS_ID, user_id: user, session_date: date, method: 'qr', checked_in_at: `${date}T10:00:00Z` })
  db.tables.class_attendance = [
    at('a1', ATHLETES[0].id, '2026-11-16'), at('a2', ATHLETES[1].id, '2026-11-16'), at('a3', ATHLETES[2].id, '2026-11-18'),
    at('a4', ATHLETES[0].id, '2026-11-09'), at('a5', ATHLETES[1].id, '2026-11-11'),
    at('a6', ATHLETES[0].id, '2026-10-05')
  ]
  await db.install(page)
  await page.goto(`/dashboard/classes?c=${CLASS_ID}`)

  const chart = page.getByRole('figure', { name: 'Présences · 8 semaines' })
  await expect(chart).toBeVisible()
  const bars = chart.getByRole('img')
  await expect(bars).toHaveCount(8)
  await expect(bars.last()).toHaveAttribute('aria-label', 'Semaine du 16 nov. : 3 présences')
  await expect(bars.first()).toHaveAttribute('aria-label', 'Semaine du 28 sept. : 0 présence')

  // Survol : la semaine et sa valeur ; au clavier, pareil.
  await bars.nth(6).hover()
  await expect(chart.locator('.wb-wk-tip')).toContainText('2 présences')
  await bars.nth(1).focus()
  await expect(chart.locator('.wb-wk-tip')).toContainText('Semaine du 5 oct.')

  await chart.getByText('Voir les chiffres').click()
  await expect(chart.locator('tbody tr')).toHaveCount(8)
})

test('cours sans présences : pas de graphique vide', async ({ page }) => {
  const db = coachDb()
  db.tables.class_attendance = []
  await db.install(page)
  await page.goto(`/dashboard/classes?c=${CLASS_ID}`)
  await expect(page.getByRole('tab', { name: 'Suivi' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('figure', { name: 'Présences · 8 semaines' })).toHaveCount(0)
})

test('accueil de l’athlète : ses minutes des 8 dernières semaines', async ({ page }) => {
  const db = athleteDb()
  db.tables.workout_sessions = [
    { id: 's1', user_id: ATHLETE.id, performed_at: '2026-11-17T11:00:00Z', active_minutes: 45 },
    { id: 's2', user_id: ATHLETE.id, performed_at: '2026-11-03T11:00:00Z', active_minutes: 30 }
  ]
  await db.install(page)
  await page.goto('/athlete')

  const chart = page.getByRole('figure', { name: 'Tes minutes d’entraînement · 8 semaines' })
  await expect(chart).toBeVisible()
  await expect(chart.getByRole('img').last()).toHaveAttribute('aria-label', 'Semaine du 16 nov. : 45 min')
  await expect(chart.getByRole('img').nth(5)).toHaveAttribute('aria-label', 'Semaine du 2 nov. : 30 min')
})
