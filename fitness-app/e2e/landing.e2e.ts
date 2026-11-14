import { test, expect, coachDb } from './fixtures'

/**
 * Accueil public : « C'est pour qui ? » en trois colonnes animées, puis une
 * page par profil qui ne montre que les fonctionnalités de ce profil.
 */

test('« c’est pour qui ? » : trois colonnes, chacune ses fonctionnalités et sa page', async ({ page }) => {
  const db = coachDb()
  db.signedIn = false
  await db.install(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/c’est pour qui/i)
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByRole('article', { name: 'Mon centre' }).getByRole('listitem'))
    .toHaveText(['Équipe et rôles', 'Tous les cours en un coup d’œil', 'WODs partagés'])
  await expect(page.getByRole('article', { name: 'Je suis membre' }).getByRole('listitem'))
    .toHaveText(['Rejoins en un lien', 'Le WOD du jour', 'Séance guidée'])
  await expect(page.getByRole('article', { name: 'Pour moi' }).getByRole('listitem'))
    .toHaveText(['Séance libre ou WOD prêt', 'Tes records', 'Des rangs à gagner'])

  // Le choix est retenu : Bienvenue proposera ce profil en premier après l'inscription.
  await page.getByRole('link', { name: 'Découvrir pour les membres' }).click()
  await expect(page).toHaveURL(/\/membres$/)
  expect(await page.evaluate(() => localStorage.getItem('wodbud_profile_hint'))).toBe('member')
})

test('animation réduite : la première scène, immobile, et toute la liste', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const db = coachDb()
  db.signedIn = false
  await db.install(page)
  await page.goto('/')
  const center = page.getByRole('article', { name: 'Mon centre' })
  await expect(center.getByRole('listitem')).toHaveCount(3)
  await page.waitForTimeout(5000)
  // Toujours la première fonctionnalité en avant : rien ne défile tout seul.
  await expect(center.locator('li[class*="featOn"]')).toHaveText('Équipe et rôles')
})

const PAGES = [
  {
    path: '/centres',
    sections: ['#centres', '#problem', '#features', '#try', '#how'],
    without: ['#app'],
    tiles: ['Ton cours vote le WOD', 'Un assistant IA'],
    withoutTiles: ['Ils reviennent pour progresser'],
    menu: ['#features', '#how', '#try', '#download']
  },
  {
    path: '/membres',
    sections: ['#membres', '#app', '#try'],
    without: ['#problem', '#features', '#how'],
    tiles: [],
    withoutTiles: ['Ton cours vote le WOD', 'Un assistant IA'],
    menu: ['#app', '#try', '#download']
  },
  {
    path: '/perso',
    sections: ['#perso', '#app', '#features', '#try'],
    without: ['#problem', '#how'],
    tiles: ['Un assistant IA'],
    withoutTiles: ['Ton cours vote le WOD', 'Ils reviennent pour progresser'],
    menu: ['#app', '#features', '#try', '#download']
  }
]

for (const p of PAGES) {
  test(`${p.path} : seulement les fonctionnalités du profil`, async ({ page }) => {
    const db = coachDb()
    db.signedIn = false
    await db.install(page)
    await page.goto(p.path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()

    for (const id of p.sections) await expect(page.locator(`section${id}`)).toHaveCount(1)
    for (const id of p.without) await expect(page.locator(`section${id}`)).toHaveCount(0)
    for (const name of p.tiles) await expect(page.getByRole('heading', { name })).toHaveCount(1)
    for (const name of p.withoutTiles) await expect(page.getByRole('heading', { name })).toHaveCount(0)

    // Le menu ne mène qu'aux sections présentes.
    const links = await page.locator('#landing-menu a[href^="#"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(links).toEqual(p.menu)
  })
}
