import { test, expect, voteDb, COACH } from './fixtures'

/** Votes du coach (4.2) : une carte partagée, nommée ; fermer, puis supprimer en deux temps. */
test('le coach ferme un vote ouvert et supprime un vote fermé', async ({ page }) => {
  const db = voteDb()
  await db.install(page)
  await page.goto('/dashboard/vote')

  const open = page.getByRole('article', { name: 'Mouvement de vendredi' })
  await expect(open).toContainText('CrossFit 6h')
  await expect(open).toContainText('Ouvert')
  await expect(open).toContainText('60.0% · 3 votes')
  await open.getByRole('button', { name: 'Fermer' }).click()
  await expect.poll(() => db.writesTo('vote_sessions', 'PATCH').map((r) => [r.id, r.status])).toEqual([['vs-open', 'closed']])

  // Le ✕ dit quel vote il supprime ; il arme d'abord, puis confirme.
  await page.getByRole('button', { name: 'Supprimer le vote — Finisher de lundi' }).click()
  await page.getByRole('button', { name: 'Confirmer' }).click()
  await expect.poll(() => db.writesTo('vote_sessions', 'DELETE').map((r) => r.id)).toEqual(['vs-closed'])
})

/** Thématiques : le choix est annoncé (aria-pressed) et chaque bouton dit quelle thématique il choisit. */
test('thématiques : choisir une autre thématique', async ({ page }) => {
  const db = voteDb()
  await db.install(page)
  await page.goto('/dashboard/vote')

  await expect(page.getByRole('button', { name: 'Choisir — Suivi du sommeil' })).toHaveAttribute('aria-pressed', 'true')
  const emom = page.getByRole('button', { name: 'Choisir — Minuterie EMOM' })
  await expect(emom).toHaveAttribute('aria-pressed', 'false')
  await emom.click()
  await expect.poll(() => db.writesTo('feature_topic_votes', 'POST')).toEqual([expect.objectContaining({ user_id: COACH.id, topic_id: 't2' })])
})

/** Côté admin : proposer une thématique au clavier (Entrée), supprimer nommé. */
test('thématiques : l’admin propose une thématique avec Entrée', async ({ page }) => {
  const db = voteDb()
  db.tables.admin_users = [{ user_id: COACH.id }]
  await db.install(page)
  await page.goto('/dashboard/admin')
  const topic = page.getByLabel(/^Thématique/)
  await topic.fill('Plans de repas')
  await topic.press('Enter')
  await expect.poll(() => db.writesTo('feature_topics', 'POST')).toEqual([expect.objectContaining({ title: 'Plans de repas', description: null })])
  await expect(page.getByRole('button', { name: 'Supprimer — Mode hors ligne' })).toBeVisible()
})
