import { test, expect, coachDb, COACH, CLASS_ID, ATHLETES } from './fixtures'

const rank = (position: number, key: string, fr: string, min: number, color: string) => ({ position, key, display_fr: fr, display_en: fr, display_es: fr, min_minutes: min, color, motto_fr: null, motto_en: null, motto_es: null })

/** Rang (4.2) : en thème clair, le nom du rang reste lisible (turquoise pur : 1,4:1 sur fond clair). */
test('rang : le nom du rang actuel est lisible en thème clair', async ({ page }) => {
  const db = coachDb()
  db.tables.ranks = [rank(1, 'recrue', 'Recrue', 0, '#8b8680'), rank(2, 'warmup', 'Warm-up', 120, '#5eead4'), rank(3, 'regulier', 'Régulier', 600, '#38bdf8')]
  Object.assign(db.tables.profiles[0], { total_minutes: 260, current_streak: 3, longest_streak: 9 })
  await db.install(page)
  await page.goto('/dashboard/rank')

  const name = page.locator('.wb-rank-id strong')
  await expect(name).toHaveText('Warm-up')
  // #5eead4 mêlé à 60 % de la couleur du texte (#17150f), et non le turquoise pur.
  await expect(name).toHaveCSS('color', /^color\(srgb 0\.20\d* 0\.41\d* 0\.36\d*\)$/)
  await expect(page.locator('.wb-ladder.is-current')).toContainText('Warm-up')
})

/** Classement d'un cours : liste ordonnée, périodes en onglets annoncés. */
test('classement : liste ordonnée, changer de période', async ({ page }) => {
  const db = coachDb()
  db.rpc.get_class_leaderboard_since = () => [
    { athlete_id: ATHLETES[0].id, full_name: 'Zoé Gagnon', minutes: 180, current_streak: 4, longest_streak: 6 },
    { athlete_id: ATHLETES[1].id, full_name: 'Alex Tremblay', minutes: 135, current_streak: 0, longest_streak: 2 },
    { athlete_id: COACH.id, full_name: 'Coach Test', minutes: 90, current_streak: 1, longest_streak: 3 }
  ]
  await db.install(page)
  await page.goto(`/dashboard/classes?c=${CLASS_ID}&tab=leaderboard`)

  const board = page.getByRole('list').filter({ hasText: 'Alex Tremblay' })
  await expect(board.getByRole('listitem')).toHaveCount(3)
  await expect(board.getByRole('listitem').first()).toContainText('Zoé Gagnon')
  await expect(board.getByRole('listitem').last()).toContainText('Coach Test')

  const month = page.getByRole('tab', { name: 'Ce mois' })
  await month.click()
  await expect(month).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute('aria-selected', 'false')
  await expect.poll(() => db.calls.filter((c) => c.fn === 'get_class_leaderboard_since').map((c) => String(c.args.p_since).slice(0, 7))).toContain('2026-11')
})
