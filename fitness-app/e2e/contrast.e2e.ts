import { test, expect, coachDb, athleteDb, voteDb, communityDb, CLASS_ID, COMMUNITY_ID, FEATURE_TOPICS } from './fixtures'
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
  ['confidentialité', '/confidentialite']
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
      await page.unrouteAll({ behavior: 'ignoreErrors' })
      await page.evaluate(() => localStorage.clear())
      await athlete.install(page)
      await page.goto('/athlete')
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      found.push(...(await lowContrast(page)).map((f) => `athlète : ${f}`))
      expect(found).toEqual([])
    })
  })
}
