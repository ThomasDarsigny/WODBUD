import { test, expect, communityDb, COMMUNITY_ID, COACH } from './fixtures'

/** Communautés (4.2) : création dans la fenêtre partagée (Échap, focus rendu). */
test('le coach crée une communauté depuis la fenêtre partagée', async ({ page }) => {
  const db = communityDb()
  await db.install(page)
  await page.goto('/dashboard/communities')

  const create = page.getByRole('button', { name: 'Créer une communauté' })
  const dialog = page.getByRole('dialog', { name: 'Créer une communauté' })
  await create.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(create).toBeFocused()

  await create.click()
  await dialog.getByLabel(/Nom/).fill('Midi pile')
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Midi pile')
  expect(db.writesTo('communities', 'POST')).toEqual([expect.objectContaining({ name: 'Midi pile', description: null, created_by: COACH.id })])
  expect(db.writesTo('community_members', 'POST')).toEqual([expect.objectContaining({ user_id: COACH.id })])
})

/** Défis : la progression est annoncée, le ✕ dit quel défi il supprime. */
test('défis : barre de progression lisible, suppression nommée en deux temps', async ({ page }) => {
  const db = communityDb()
  await db.install(page)
  await page.goto(`/dashboard/communities/${COMMUNITY_ID}`)
  await page.getByRole('tab', { name: 'Défis' }).click()

  await expect(page.getByRole('progressbar', { name: '1 000 minutes en novembre' })).toHaveAttribute('aria-valuenow', '64')
  await page.getByRole('button', { name: 'Supprimer — 1 000 minutes en novembre' }).click()
  await page.getByRole('button', { name: 'Confirmer' }).click()
  await expect.poll(() => db.writesTo('community_challenges', 'DELETE').map((c) => c.id)).toEqual(['ch1'])
})

/** Profil d'un membre : vraie fenêtre nommée, couleur du rang, Échap rend le focus. */
test('profil d’un membre : rang coloré, progression, fermeture au clavier', async ({ page }) => {
  const db = communityDb()
  await db.install(page)
  await page.goto(`/dashboard/communities/${COMMUNITY_ID}`)
  await page.getByRole('tab', { name: 'Membres' }).click()
  await expect(page.locator('.wb-rank-pill').first()).toHaveCSS('color', 'rgb(205, 127, 50)')

  const alex = page.getByRole('button', { name: /^Alex Tremblay/ })
  await alex.click()
  const dialog = page.getByRole('dialog', { name: 'Alex Tremblay' })
  await expect(dialog.getByText('Bronze')).toHaveCSS('color', 'rgb(205, 127, 50)')
  // 260 min entre bronze (120) et argent (600) : 29 %.
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '29')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(alex).toBeFocused()
})
