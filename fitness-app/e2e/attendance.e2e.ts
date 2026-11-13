import { test, expect, athleteDb, ATHLETE, CLASS_ID, TODAY } from './fixtures'

const QR_PATH = `/presence/${CLASS_ID}?k=e2e0c0de0e2e0c0de0e2e0c0de0e2e0c`

/** Parcours 4 : présences (3.2) — scan du QR, « Je suis là », scan sans être connecté. */
test.describe('présence au cours', () => {
  test('le scan du QR enregistre la présence', async ({ page }) => {
    const db = athleteDb()
    await db.install(page)
    await page.goto(QR_PATH)
    await expect(page.locator('.wb-checkin-card')).toContainText('Présence enregistrée')
    await expect(page.locator('.wb-checkin-card')).toContainText('CrossFit 6h')
    expect(db.calls.filter((c) => c.fn === 'check_in')).toEqual([{ fn: 'check_in', args: { p_class: CLASS_ID, p_date: TODAY, p_code: 'e2e0c0de0e2e0c0de0e2e0c0de0e2e0c' } }])
  })

  test('un QR expiré le dit clairement', async ({ page }) => {
    const db = athleteDb({ checkIn: 'bad_code' })
    await db.install(page)
    await page.goto(QR_PATH)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ce QR a expiré')
  })

  test('« Je suis là » sur la carte du cours, 15 minutes avant', async ({ page }) => {
    const db = athleteDb()
    await db.install(page)
    await page.goto('/athlete')
    const card = page.locator('.wb-class-card').filter({ hasText: 'CrossFit 6h' })
    await expect(card).toContainText('Prochain cours : mercredi 18 novembre · 6 h')
    await card.getByRole('button', { name: 'Je suis là' }).click()
    await expect(card).toContainText('Présent au cours de 6 h')
    expect(db.calls.find((c) => c.fn === 'check_in')?.args).toEqual({ p_class: CLASS_ID, p_date: TODAY })
  })

  test('scan sans être connecté : connexion, puis retour à la présence', async ({ page }) => {
    const db = athleteDb({ signedIn: false })
    await db.install(page)
    await page.goto(QR_PATH)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connecte-toi pour être compté présent')
    expect(db.calls).toEqual([])

    await page.getByRole('link', { name: 'Connexion' }).click()
    await page.getByLabel(/courriel|e-mail|email/i).fill(ATHLETE.email)
    await page.getByLabel(/mot de passe/i).fill('mot-de-passe-de-test')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(new RegExp(`/presence/${CLASS_ID}`))
    await expect(page.locator('.wb-checkin-card')).toContainText('Présence enregistrée')
  })
})
