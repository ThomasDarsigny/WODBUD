import { test, expect, athleteDb } from './fixtures'

/**
 * Page de retour de connexion (A2) : Google ou Apple depuis l'app des
 * boutiques, ou lien de confirmation du courriel. Le code s'échange contre une
 * session avec le secret (code verifier) gardé au départ de la connexion.
 */
const VERIFIER_KEY = 'sb-supabase-auth-token-code-verifier'
const VERIFIER = 'v'.repeat(56)

test('le code de retour devient une session, puis l’accueil du compte', async ({ page }) => {
  const db = athleteDb({ signedIn: false })
  await db.install(page)
  // Le départ de la connexion (dans l'app) a gardé le secret.
  await page.addInitScript(([key, value]) => { localStorage.setItem(key, value) }, [VERIFIER_KEY, JSON.stringify(VERIFIER)] as const)

  await page.goto('/auth/callback?code=code-google-123&flow=oauth')

  await expect(page).toHaveURL(/\/athlete$/)
  const exchange = db.authCalls.find((c) => c.path === '/auth/v1/token')
  expect(exchange?.body).toMatchObject({ auth_code: 'code-google-123', code_verifier: VERIFIER })
})

test('connexion annulée chez Google : message clair, retour à la connexion', async ({ page }) => {
  const db = athleteDb({ signedIn: false })
  await db.install(page)
  await page.goto('/auth/callback?error=access_denied&error_description=User+cancelled&flow=oauth')

  await expect(page.getByRole('heading', { name: 'Connexion impossible' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('La connexion a été annulée.')
  await page.getByRole('link', { name: 'Aller à la connexion' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(db.authCalls.filter((c) => c.path === '/auth/v1/token')).toHaveLength(0)
})

test('lien du courriel ouvert ailleurs (sans le secret) : adresse confirmée, se connecter', async ({ page }) => {
  const db = athleteDb({ signedIn: false })
  await db.install(page)
  await page.goto('/auth/callback?code=code-courriel-456')

  await expect(page.getByRole('heading', { name: 'Adresse confirmée' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Aller à la connexion' })).toBeVisible()
})

test('retour de Google sans le secret (données de l’app effacées entre-temps) : erreur, pas « confirmée »', async ({ page }) => {
  const db = athleteDb({ signedIn: false })
  await db.install(page)
  await page.goto('/auth/callback?code=code-google-789&flow=oauth')

  await expect(page.getByRole('heading', { name: 'Connexion impossible' })).toBeVisible()
})
