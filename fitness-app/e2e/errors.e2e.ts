import { test, expect, coachDb, communityDb, COACH, COMMUNITY_ID } from './fixtures'

/** Suivi des erreurs (4.5). */

test('erreurs non attrapées : signalées une seule fois, page sans identifiant', async ({ page }) => {
  const db = communityDb()
  await db.install(page)
  await page.goto(`/dashboard/communities/${COMMUNITY_ID}`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()

  // Les événements que la page reçoit quand du code de l'app lève une erreur. (Une erreur levée
  // depuis le script du test serait masquée par Chrome en « Script error. », que le suivi ignore.)
  await page.evaluate(() => {
    for (let i = 0; i < 2; i++) window.dispatchEvent(new ErrorEvent('error', { error: new TypeError('Boum e2e'), message: 'Boum e2e' }))
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('Promesse e2e') }))
  })
  const calls = () => db.calls.filter((c) => c.fn === 'log_client_error')
  await expect.poll(() => calls().length).toBe(2)
  await page.waitForTimeout(300)
  // La même erreur deux fois : un seul envoi.
  expect(calls().map((c) => [c.args.p_kind, c.args.p_message])).toEqual([['error', 'TypeError: Boum e2e'], ['unhandledrejection', 'Promesse e2e']])
  expect(calls()[0].args).toMatchObject({ p_path: '/dashboard/communities/:id', p_app_version: 'dev' })
})

test('un écran qui plante affiche un message, le menu reste utilisable, et c’est signalé', async ({ page, isMobile }) => {
  const db = coachDb()
  await db.install(page)
  // Le code de l'écran Votes ne se télécharge pas (comme un vieil onglet après un déploiement).
  await page.route('**/src/components/dashboard/VoteView.tsx*', (route) => route.abort())
  await page.goto('/dashboard/today')
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  await page.goto('/dashboard/vote')

  await expect(page.getByRole('alert')).toContainText('Cet écran a planté.')
  await expect(page.getByRole('button', { name: 'Recharger' })).toBeVisible()
  await expect.poll(() => db.calls.filter((c) => c.fn === 'log_client_error').map((c) => c.args.p_kind)).toContain('render')

  // Le reste de l'app fonctionne : on change de page depuis le menu.
  if (isMobile) await page.getByRole('link', { name: 'Accueil', exact: true }).click()
  else await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: /aujourd/i }).click()
  await expect(page).toHaveURL(/\/dashboard\/today$/)
  await expect(page.getByRole('alert').filter({ hasText: 'Cet écran a planté.' })).toHaveCount(0)
})

test('l’administration voit les erreurs regroupées', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  db.tables.client_errors = [
    { id: 1, created_at: '2026-11-17T10:00:00Z', kind: 'error', message: "Cannot read properties of undefined (reading 'name')", path: '/dashboard/vote', app_version: 'a1b2c3d' },
    { id: 2, created_at: '2026-11-18T05:00:00Z', kind: 'error', message: "Cannot read properties of undefined (reading 'name')", path: '/athlete', app_version: 'a1b2c3d' },
    { id: 3, created_at: '2026-11-16T08:00:00Z', kind: 'render', message: 'Failed to fetch dynamically imported module', path: '/dashboard/rank', app_version: '9f8e7d6' }
  ]
  await db.install(page)
  await page.goto('/dashboard/admin')

  const section = page.locator('section', { has: page.getByRole('heading', { name: 'Erreurs des utilisateurs' }) })
  const items = section.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.first()).toContainText('2 fois')
  await expect(items.first()).toContainText('/athlete · /dashboard/vote')
  await expect(items.last()).toContainText('Écran planté')
})
