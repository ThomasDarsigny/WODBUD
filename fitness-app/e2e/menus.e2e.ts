import { test, expect, coachDb, athleteDb } from './fixtures'

/** Menus (4.2) : la barre latérale se replie avec un bouton nommé, la page courante est annoncée. */
test('menu du coach : replier et déplier, page courante annoncée', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Sur téléphone, la barre latérale laisse la place aux onglets du bas.')
  const db = coachDb()
  await db.install(page)
  await page.goto('/dashboard/today')

  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: /aujourd/i })).toHaveAttribute('aria-current', 'page')

  const collapse = page.getByRole('button', { name: 'Réduire le menu' })
  await expect(collapse).toHaveAttribute('aria-expanded', 'true')
  await collapse.click()

  // Replié : les icônes seules gardent un nom, la page courante reste annoncée.
  const expand = page.getByRole('button', { name: 'Agrandir le menu' })
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expect(nav.getByRole('link', { name: /aujourd/i })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Groupes' })).toBeVisible()
  await expand.click()
  await expect(page.getByRole('button', { name: 'Réduire le menu' })).toBeVisible()
})

test('menu de l’athlète : navigation nommée, page courante annoncée', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Sur téléphone, la barre latérale laisse la place aux onglets du bas.')
  const db = athleteDb()
  await db.install(page)
  await page.goto('/athlete')

  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Journal' })).not.toHaveAttribute('aria-current', /.*/)
})
