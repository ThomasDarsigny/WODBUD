import { test, expect, coachDb, COACH } from './fixtures'

/** Contact (/contact, migration 072) : envoi, refus, champ piège, et réception dans l'administration. */

test('le lien Contact du pied de page ouvre le formulaire, qui envoie le message', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  db.rpc.send_contact_message = () => 'ok'
  await db.install(page)
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/\/contact$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parlons de ta box.')

  await page.getByLabel('Ton nom').fill('Julie Martin')
  await page.getByLabel('Ton courriel').fill('julie@exemple.com')
  await page.getByRole('radio', { name: 'Mon centre est intéressé' }).check()
  await page.getByLabel('Nom du centre (facultatif)').fill('CrossFit Limoilou')
  await page.getByLabel('Ton message').fill('Bonjour, on aimerait essayer WODBUD avec nos 4 entraîneurs.')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByRole('status')).toContainText('Merci. On te répond à julie@exemple.com.')
  const calls = db.calls.filter((c) => c.fn === 'send_contact_message')
  expect(calls).toHaveLength(1)
  expect(calls[0].args).toMatchObject({ p_name: 'Julie Martin', p_email: 'julie@exemple.com', p_topic: 'center', p_organization: 'CrossFit Limoilou', p_locale: 'fr' })
})

test('trop de messages : le refus est annoncé, et le formulaire reste rempli', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  db.rpc.send_contact_message = () => 'rate_limited'
  await db.install(page)
  await page.goto('/contact')

  await page.getByLabel('Ton nom').fill('Alex')
  await page.getByLabel('Ton courriel').fill('alex@exemple.com')
  await page.getByRole('radio', { name: 'Une question' }).check()
  await expect(page.getByLabel('Nom du centre (facultatif)')).toHaveCount(0)
  await page.getByLabel('Ton message').fill('Est-ce que l’app marche hors ligne ?')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByRole('alert')).toHaveText('Tu as envoyé plusieurs messages en peu de temps. Réessaie dans une heure.')
  await expect(page.getByLabel('Ton message')).toHaveValue('Est-ce que l’app marche hors ligne ?')
})

test('un robot qui remplit le champ piège ne déclenche aucun envoi', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  db.rpc.send_contact_message = () => 'ok'
  await db.install(page)
  await page.goto('/contact')

  await page.getByLabel('Ton nom').fill('Robot')
  await page.getByLabel('Ton courriel').fill('robot@exemple.com')
  await page.getByLabel('Ton message').fill('Achetez nos liens, offre spéciale.')
  await page.locator('#contact-website').fill('https://spam.example')
  await page.getByRole('button', { name: 'Envoyer' }).click()

  await expect(page.getByRole('status')).toContainText('Message envoyé')
  expect(db.calls.filter((c) => c.fn === 'send_contact_message')).toHaveLength(0)
})

test('l’administration lit les messages du site et les marque traités', async ({ page }) => {
  const db = coachDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  db.tables.contact_messages = [
    { id: 7, created_at: '2026-11-17T14:00:00Z', name: 'Julie Martin', email: 'julie@exemple.com', topic: 'center', organization: 'CrossFit Limoilou', message: 'On aimerait essayer WODBUD.', locale: 'fr', status: 'new' }
  ]
  await db.install(page)
  await page.goto('/dashboard/admin')

  const section = page.locator('section', { has: page.getByRole('heading', { name: /Messages du site/ }) })
  await expect(section.getByRole('listitem')).toContainText('Julie Martin · CrossFit Limoilou')
  await expect(section.getByRole('link', { name: 'Répondre' })).toHaveAttribute('href', /^mailto:julie@exemple\.com/)
  await section.getByRole('button', { name: 'Traité', exact: true }).click()
  await expect.poll(() => db.writesTo('contact_messages', 'PATCH').map((r) => [r.id, r.status])).toEqual([[7, 'done']])
  await expect(section.getByRole('listitem')).toHaveCount(0)
})
