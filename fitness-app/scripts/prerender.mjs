/**
 * Prérendu de la landing, exécuté après `vite build`.
 *
 * Pourquoi : l'app est une SPA, donc le HTML servi sur `/` est une page vide.
 * Les robots qui n'exécutent pas le JavaScript, et les aperçus de liens,
 * ne voient alors aucun contenu. On injecte ici le HTML de la landing dans
 * `dist/index.html`.
 *
 * Il inline aussi le CSS : un <link rel="stylesheet"> bloque le premier rendu le temps d'un
 * aller-retour réseau, et ce CSS ne pèse que quelques Ko.
 *
 * Le rendu passe par un build SSR de Vite (et pas par le serveur de dev) pour
 * que les noms de classes CSS soient ceux du build de production.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ssrDir = resolve(root, 'dist-ssr')
const indexPath = resolve(root, 'dist/index.html')

try {
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--ssr', 'src/prerender-entry.tsx', '--outDir', 'dist-ssr', '--emptyOutDir'],
    { cwd: root, stdio: 'inherit' }
  )

  const entry = pathToFileURL(resolve(ssrDir, 'prerender-entry.js')).href
  const { render } = await import(entry)
  const html = await render()

  const template = readFileSync(indexPath, 'utf8')
  const marker = '<div id="root"></div>'
  if (!template.includes(marker)) throw new Error(`Marqueur ${marker} introuvable dans dist/index.html`)
  if (!html.includes('<h1')) throw new Error('Le prérendu ne contient pas de <h1> : rendu suspect, abandon.')

  let out = template.replace(marker, `<div id="root"><div data-prerender>${html}</div></div>`)

  // CSS inline : on ne touche qu'aux feuilles locales générées par Vite.
  out = out.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (_tag, href) => {
    const css = readFileSync(resolve(root, 'dist', href.slice(1)), 'utf8')
    return `<style>${css}</style>`
  })

  writeFileSync(indexPath, out)
  console.log(`Prérendu de la landing injecté (${Math.round(html.length / 1024)} Ko de HTML).`)
} finally {
  rmSync(ssrDir, { recursive: true, force: true })
}
