import { test, expect, coachDb, athleteDb, voteDb, communityDb, CLASS_ID, COMMUNITY_ID, FEATURE_TOPICS, COACH, usageStats } from './fixtures'
import { lowContrast } from './contrast'

/**
 * Garde-fou de contraste (4.4) : tout texte des écrans principaux atteint 4,5:1
 * (3:1 en grand), en thème clair et en thème sombre. Les couleurs ne dépendent
 * pas de la largeur : un seul format, l'ordinateur.
 */
const COACH_PAGES: [string, string][] = [
  ['accueil', '/dashboard/today'],
  ['cours · suivi', `/dashboard/classes?c=${CLASS_ID}`],
  ['cours · membres', `/dashboard/classes?c=${CLASS_ID}&tab=members`],
  ['cours · planning', `/dashboard/classes?c=${CLASS_ID}&tab=planning`],
  ['journal', '/dashboard/journal'],
  ['records', '/dashboard/records'],
  ['rang', '/dashboard/rank'],
  ['paramètres', '/dashboard/settings'],
  ['exercices', '/dashboard/exercises'],
  ['créateur', '/dashboard/workout'],
  ['séance', '/dashboard/session'],
  ['connexion', '/login'],
  ['inscription', '/signup'],
  ['confidentialité', '/confidentialite'],
  ['groupes', '/dashboard/groups'],
  // Toujours sombre, même quand l'appareil est en clair (constat 12).
  ['mode TV', `/tv/${CLASS_ID}`]
]

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`contraste, thème ${scheme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme: scheme })
    test.beforeEach(({ isMobile }) => { test.skip(isMobile, 'Les couleurs ne dépendent pas de la largeur.') })

    test('écrans du coach et pages publiques', async ({ page }) => {
      test.setTimeout(120_000)
      const db = coachDb()
      await db.install(page)
      const found: string[] = []
      for (const [name, path] of COACH_PAGES) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        found.push(...(await lowContrast(page)).map((f) => `${name} : ${f}`))
      }
      expect(found).toEqual([])
    })

    test('votes, communautés, accueil de l’athlète', async ({ page }) => {
      test.setTimeout(120_000)
      const found: string[] = []
      const votes = voteDb()
      await votes.install(page)
      await page.goto('/dashboard/vote')
      await page.getByText('Mouvement de vendredi').waitFor()
      found.push(...(await lowContrast(page)).map((f) => `votes : ${f}`))

      const commu = communityDb()
      await page.unrouteAll({ behavior: 'ignoreErrors' })
      await commu.install(page)
      await page.goto(`/dashboard/communities/${COMMUNITY_ID}`)
      await page.getByRole('heading', { level: 1 }).waitFor()
      for (const tab of ['Activité', 'Défis', 'Classement', 'WOD', 'Membres']) {
        await page.getByRole('tab', { name: tab }).click()
        await page.waitForLoadState('networkidle')
        found.push(...(await lowContrast(page)).map((f) => `communauté · ${tab} : ${f}`))
      }

      const athlete = athleteDb()
      athlete.rpc.get_feature_topics = () => FEATURE_TOPICS.map((t) => ({ ...t }))
      // Page neuve : sur la même page, le script de démarrage du coach
      // (votes) reconnectait le coach, et l'étape vérifiait « Bienvenue ».
      const athletePage = await page.context().newPage()
      await athletePage.addInitScript(() => { try { localStorage.clear() } catch { /* stockage indisponible */ } })
      await athlete.install(athletePage)
      await athletePage.goto('/athlete')
      await athletePage.getByRole('heading', { level: 1 }).first().waitFor()
      expect(new URL(athletePage.url()).pathname, 'accueil athlète').toBe('/athlete')
      found.push(...(await lowContrast(athletePage)).map((f) => `athlète : ${f}`))
      await athletePage.close()
      expect(found).toEqual([])
    })

    // Écrans ajoutés le 17 novembre : présence, administration, centre, bienvenue, assistant IA.
    test('présence, administration, centre, bienvenue, assistant IA', async ({ page }) => {
      test.setTimeout(120_000)
      const found: string[] = []
      // Une page neuve par compte : chaque install() ajoute son script de
      // démarrage à la page, et le premier compte resterait connecté.
      const asAccount = async (db: ReturnType<typeof coachDb>, screens: [string, string][]) => {
        const p = await page.context().newPage()
        await p.addInitScript(() => { try { localStorage.clear() } catch { /* stockage indisponible */ } })
        await db.install(p)
        for (const [name, path] of screens) {
          await p.goto(path)
          await p.waitForLoadState('networkidle')
          await p.getByRole('heading').first().waitFor()
          // Le bon écran, pas une redirection (connexion, bienvenue, accueil).
          expect(new URL(p.url()).pathname, name).toBe(path.split(/[?#]/)[0])
          found.push(...(await lowContrast(p)).map((f) => `${name} : ${f}`))
        }
        await p.close()
      }

      await asAccount(athleteDb({ checkIn: 'ok' }), [['présence', `/presence/${CLASS_ID}?code=482913`]])

      const center = { id: 'ce000000-0000-4000-8000-000000000001', name: 'Box Limoilou', owner_id: COACH.id, equipment: ['barbell', 'plates'], venue: 'box', group_size: '11-30' }
      const admin = coachDb({ tables: {
        admin_users: [{ user_id: COACH.id }],
        centers: [center],
        center_members: [{ center_id: center.id, user_id: COACH.id, role: 'owner', joined_at: '2026-01-01T00:00:00Z', centers: center }],
        center_invites: [],
        contact_messages: [{ id: 1, created_at: '2026-11-17T14:00:00Z', name: 'Julie Martin', email: 'julie@exemple.com', topic: 'center', organization: 'CrossFit Limoilou', message: 'On aimerait essayer WODBUD.', locale: 'fr', status: 'new' }]
      } })
      // Les statistiques d'usage avec des chiffres : tuiles, semaines et centres affichés.
      admin.rpc.admin_usage_stats = () => usageStats()
      await asAccount(admin, [
        ['administration', '/dashboard/admin'],
        ['centre (réglages)', '/dashboard/settings#equipe'],
        ['assistant IA', '/dashboard/ai']
      ])

      const newcomer = coachDb()
      newcomer.tables.profiles[0].role = null
      await asAccount(newcomer, [['bienvenue', '/bienvenue']])

      expect(found).toEqual([])
    })
  })
}
