import { test, expect, athleteDb, ATHLETE, CLASS_ID } from './fixtures'

const CLASS = { id: CLASS_ID, name: 'CrossFit 6h', description: null, schedule: null, coach_id: 'x', invite_token: 'e2e-invite', created_at: '2026-01-01', center_id: null }

/** Page d'invitation (4.2) : champs reliés à leurs étiquettes ; connexion, puis le cours est rejoint. */
test('une athlète invitée se connecte et rejoint le cours', async ({ page }) => {
  const db = athleteDb({ signedIn: false })
  db.tables.class_members = []
  db.rpc.get_class_by_invite_token = (args) => (args.p_token === 'e2e-invite' ? [CLASS] : [])
  await db.install(page)
  await page.goto('/join/e2e-invite')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Créer un compte')
  await expect(page.getByLabel(/Prénom et nom/i)).toHaveAttribute('autocomplete', 'name')
  await page.getByRole('button', { name: 'Connexion' }).click()

  await page.getByLabel(/Courriel/i).fill(ATHLETE.email)
  const password = page.getByLabel(/Mot de passe/i)
  await expect(password).toHaveAttribute('autocomplete', 'current-password')
  await password.fill('mot-de-passe-de-test')
  await page.getByRole('button', { name: /Se connecter|Connexion/i }).last().click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CrossFit 6h')
  expect(db.writesTo('class_members', 'POST')).toEqual([expect.objectContaining({ class_id: CLASS_ID, athlete_id: ATHLETE.id })])
})

test('un lien d’invitation invalide le dit', async ({ page }) => {
  const db = athleteDb()
  db.rpc.get_class_by_invite_token = () => []
  await db.install(page)
  await page.goto('/join/mauvais-jeton')
  await expect(page.getByRole('alert')).toBeVisible()
})
