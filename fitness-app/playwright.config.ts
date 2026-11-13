import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de bout en bout (phase 4, 4.1). L'app tourne sur son propre port avec
 * une fausse adresse Supabase : tout le réseau est simulé par e2e/supabase-mock.ts.
 * Chrome installé sur la machine (ou sur le runner GitHub) suffit : aucun
 * navigateur à télécharger.
 */
const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // En local, 6 navigateurs : à 10 (la moitié des cœurs, le défaut), Vite et Chrome
  // saturaient la machine — des chargements n'aboutissaient pas (échecs au hasard
  // vers 50 s) et la suite était plus lente (1 min 30 contre 55 s).
  workers: process.env.CI ? 2 : 6,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    // Le service worker de la PWA échapperait à l'interception du réseau.
    serviceWorkers: 'block',
    locale: 'fr-CA',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'ordinateur', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'telephone', use: { ...devices['Pixel 7'], channel: 'chrome' } }
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'http://supabase.test',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key'
    }
  }
})
