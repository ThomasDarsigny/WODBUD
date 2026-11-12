/**
 * Prérendu des pages publiques, exécuté après `vite build`.
 *
 * Pourquoi : l'app est une SPA, donc le HTML servi est une page vide. Les
 * robots qui n'exécutent pas le JavaScript, et les aperçus de liens, ne
 * verraient aucun contenu. On écrit ici une page HTML par adresse publique :
 *
 *   /          → dist/index.html          (choix du profil ; sert aussi de
 *                                          coquille à toutes les routes de l'app)
 *   /centres   → dist/centres/index.html
 *   /membres   → dist/membres/index.html
 *   /perso     → dist/perso/index.html
 *
 * Chaque page reçoit son <title>, sa description, ses balises Open Graph /
 * Twitter et son lien canonique. Le CSS est inline : un <link rel="stylesheet">
 * bloquerait le premier rendu le temps d'un aller-retour réseau.
 *
 * Le rendu passe par un build SSR de Vite (et pas par le serveur de dev) pour
 * que les noms de classes CSS soient ceux du build de production.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ssrDir = resolve(root, 'dist-ssr')
const distDir = resolve(root, 'dist')
const indexPath = resolve(distDir, 'index.html')
const SITE = 'https://wodbud.com'

const escapeAttr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** Remplace l'attribut content d'une balise meta repérée par name= ou property=. */
function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`Balise meta ${attr}="${key}" introuvable dans index.html`)
  return html.replace(re, `$1${escapeAttr(value)}$2`)
}

try {
  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--ssr', 'src/prerender-entry.tsx', '--outDir', 'dist-ssr', '--emptyOutDir'],
    { cwd: root, stdio: 'inherit' }
  )

  const entry = pathToFileURL(resolve(ssrDir, 'prerender-entry.js')).href
  const { renderPages } = await import(entry)
  const pages = await renderPages()

  let template = readFileSync(indexPath, 'utf8')
  const marker = '<div id="root"></div>'
  if (!template.includes(marker)) throw new Error(`Marqueur ${marker} introuvable dans dist/index.html`)

  // CSS inline : on ne touche qu'aux feuilles locales générées par Vite.
  template = template.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (_tag, href) => {
    const css = readFileSync(resolve(distDir, href.slice(1)), 'utf8')
    return `<style>${css}</style>`
  })

  for (const page of pages) {
    if (!page.html.includes('<h1')) throw new Error(`Le prérendu de ${page.path} ne contient pas de <h1> : rendu suspect, abandon.`)
    const url = `${SITE}${page.path === '/' ? '/' : page.path}`

    let out = template.replace(marker, `<div id="root"><div data-prerender>${page.html}</div></div>`)
    // Le contenu prérendu ne vaut que pour son adresse (voir le script dans index.html).
    out = out.replace('<html lang="fr">', `<html lang="fr" data-prerender-path="${page.path}">`)
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(page.title)}</title>`)
    out = setMeta(out, 'name', 'description', page.description)
    out = setMeta(out, 'property', 'og:url', url)
    out = setMeta(out, 'property', 'og:title', page.title)
    out = setMeta(out, 'property', 'og:description', page.description)
    out = setMeta(out, 'name', 'twitter:title', page.title)
    out = setMeta(out, 'name', 'twitter:description', page.description)
    out = out.replace('</title>', `</title>\n  <link rel="canonical" href="${url}" />`)

    const target = page.path === '/' ? indexPath : resolve(distDir, page.path.slice(1), 'index.html')
    mkdirSync(resolve(target, '..'), { recursive: true })
    writeFileSync(target, out)
    console.log(`Prérendu ${page.path} (${Math.round(page.html.length / 1024)} Ko de HTML).`)
  }
} finally {
  rmSync(ssrDir, { recursive: true, force: true })
}
