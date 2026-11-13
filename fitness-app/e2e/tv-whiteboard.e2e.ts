import { test, expect, coachDb, CLASS_ID, PLAN_ID } from './fixtures'

/** Parcours 5 : le mode TV de la salle (3.3) et le tableau blanc (1.4). */
test('le mode TV affiche le WOD, le QR, les arrivées, puis le tableau blanc', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto(`/tv/${CLASS_ID}`)

  await expect(page.locator('.wb-tv-title')).toHaveText('Fran')
  await expect(page.locator('.wb-tv-lines li').first()).toContainText('Thruster')
  await expect(page.locator('.wb-tv-lines li').first()).toContainText('43 kg / 30 kg')
  await expect(page.locator('.wb-tv-notes')).toHaveText('Cap 10 min.')
  await expect(page.locator('.wb-tv-qr svg')).toBeVisible()
  await expect(page.locator('.wb-tv-count')).toHaveText('1 présent')
  await expect(page.locator('.wb-tv-arrivals')).toContainText('Alex Tremblay')

  // B : tableau blanc (RX d'abord), W : retour au WOD.
  await page.keyboard.press('b')
  await expect(page.locator('.wb-tv-board li')).toHaveText([/1\s*Alex Tremblay\s*4:32\s*RX/, /2\s*Marc Roy\s*4:11\s*Adapté/])
  await page.keyboard.press('w')
  await expect(page.locator('.wb-tv-title')).toHaveText('Fran')
})

test('le coach réagit à un score sur le tableau blanc', async ({ page }) => {
  const db = coachDb()
  await db.install(page)
  await page.goto(`/dashboard/whiteboard/${PLAN_ID}`)

  const first = page.locator('.wb-board-row').first()
  await expect(first).toContainText('Alex Tremblay')
  await first.getByRole('button', { name: '👏' }).click()
  await expect(first.getByRole('button', { name: '👏' })).toHaveAttribute('aria-pressed', 'true')
  expect(db.writesTo('score_reactions', 'POST')).toEqual([expect.objectContaining({ score_id: 's1', emoji: '👏' })])
})
