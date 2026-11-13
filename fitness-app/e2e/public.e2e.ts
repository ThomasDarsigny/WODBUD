import { test, expect, coachDb, COACH, RANKS } from './fixtures'

/** Pages publiques (4.2) : connexion refusée, inscription, rang partagé. */

test('connexion refusée : message en français, annoncé, puis connexion', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  db.authErrors['/auth/v1/token'] = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }
  await db.install(page)

  await page.goto('/login')
  await page.getByLabel('Courriel').fill(COACH.email)
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  // GoTrue répond « Invalid login credentials » : la personne lit sa langue.
  await expect(page.getByRole('alert')).toHaveText('Courriel ou mot de passe incorrect.')

  delete db.authErrors['/auth/v1/token']
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/dashboard\/today$/)
})

test('inscription : mots de passe différents, puis courriel de confirmation et renvoi', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  await db.install(page)

  await page.goto('/signup')
  await page.getByLabel('Ton nom').fill('Alex Tremblay')
  await page.getByLabel('Courriel').fill('alex@exemple.com')
  await page.getByLabel(/^Mot de passe/).fill('secret-1')
  const confirm = page.getByLabel('Confirmer le mot de passe')
  await confirm.fill('secret-2')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  // L'erreur est annoncée et le champ fautif reprend le focus.
  await expect(page.getByRole('alert')).toHaveText('Les mots de passe ne correspondent pas.')
  await expect(confirm).toBeFocused()
  await expect(confirm).toHaveAttribute('aria-invalid', 'true')
  expect(db.authCalls).toEqual([])

  await confirm.fill('secret-1')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Vérifie ton courriel' })).toBeVisible()
  const [signup] = db.authCalls.filter((c) => c.path === '/auth/v1/signup')
  expect(signup.body).toMatchObject({ email: 'alex@exemple.com', password: 'secret-1', data: { full_name: 'Alex Tremblay' } })

  // Renvoi trop rapproché : la limite de Supabase s'affiche en français.
  db.authErrors['/auth/v1/resend'] = { status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }
  await page.getByRole('button', { name: 'Renvoyer le courriel' }).click()
  await expect(page.getByRole('alert')).toHaveText('Trop de tentatives. Réessaie dans quelques minutes.')

  delete db.authErrors['/auth/v1/resend']
  await page.getByRole('button', { name: 'Renvoyer le courriel' }).click()
  await expect(page.getByRole('button', { name: '✓ Courriel renvoyé' })).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('rang partagé : page nommée, lien social sûr et lisible, lien invalide', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  db.tables.ranks = RANKS.map((r) => ({ ...r }))
  db.rpc.get_shared_rank = (args) => args.p_token === 'bon'
    ? [{ display_name: 'Alex Tremblay', rank_key: 'bronze', total_minutes: 260, current_streak: 4, avatar_url: null, social_links: [{ platform: 'instagram', url: 'https://instagram.com/alex.test' }] }]
    : []
  await db.install(page)

  await page.goto('/rang/bon')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alex Tremblay')
  await expect(page).toHaveTitle('Alex Tremblay · Rang WODBUD | WODBUD')
  const insta = page.getByRole('link', { name: 'Instagram' })
  await expect(insta).toHaveAttribute('rel', /noopener/)
  await expect(insta).toHaveAttribute('rel', /nofollow/)
  // Thème clair : le bronze pur passait sous 3:1 ; mêlé à 60 % de la couleur du texte, il est lisible.
  await expect(insta).toHaveCSS('color', 'color(srgb 0.375686 0.248627 0.113725)')

  await page.goto('/rang/mauvais')
  await expect(page.getByText('Ce lien de partage n\'est plus valide.')).toBeVisible()
})
