import { test, expect, athleteDb, ATHLETE, CLASS_ID, EXERCISES } from './fixtures'

/** Vote de l'athlète (4.2) : un seul choix par vote, modifiable tant que le vote est ouvert. */
test('l’athlète change son vote et l’enregistre', async ({ page }) => {
  const db = athleteDb()
  db.tables.vote_sessions = [{ id: 'vs1', class_id: CLASS_ID, coach_id: 'x', title: 'Mouvement de vendredi', status: 'open', deadline: null, exercise_options: [], created_at: '2026-11-17T00:00:00Z' }]
  db.tables.vote_options = [
    { id: 'o1', vote_session_id: 'vs1', exercise_id: EXERCISES[0].id, label: null, color: '#ff5a1f', position: 1 },
    { id: 'o2', vote_session_id: 'vs1', exercise_id: EXERCISES[1].id, label: null, color: '#38bdf8', position: 2 }
  ]
  db.tables.vote_results = []
  db.tables.exercise_votes = [{ vote_session_id: 'vs1', user_id: ATHLETE.id, vote_option_id: 'o2', exercise_id: EXERCISES[1].id }]
  await db.install(page)
  await page.goto('/athlete/vote/vs1')

  await expect(page.getByRole('status').filter({ hasText: 'déjà voté' })).toBeVisible()
  const thruster = page.getByRole('button', { name: /Thruster/ })
  await expect(thruster).toHaveAttribute('aria-pressed', 'true')
  const save = page.getByRole('button', { name: 'Mettre à jour' })
  await expect(save).toBeDisabled()

  await page.getByRole('button', { name: /Back squat/ }).click()
  await expect(page.getByRole('button', { name: /Back squat/ })).toHaveAttribute('aria-pressed', 'true')
  await save.click()

  await expect(save).toBeDisabled()
  expect(db.writesTo('exercise_votes', 'POST')).toEqual([expect.objectContaining({ vote_session_id: 'vs1', vote_option_id: 'o1', exercise_id: EXERCISES[0].id })])
})
