/**
 * Icônes et écrans de démarrage de l'app Android, tirés du logo.
 *
 *   node scripts/android-assets.mjs
 *
 * 1. Dessine les sources dans assets/ (navigateur de Playwright) :
 *    icon-only.png (icône complète, Android 7), icon-foreground.png et
 *    icon-background.png (icône adaptative, Android 8+), splash.png et
 *    splash-dark.png (démarrage avant Android 12 ; après, c'est l'icône).
 * 2. Les décline à toutes les densités dans android/app/src/main/res avec
 *    @capacitor/assets.
 *
 * Logo PROVISOIRE (le W du favicon) : la refonte en apporte un nouveau. Il
 * suffira de changer MARK, les couleurs ci-dessous, et de relancer.
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'assets')

const ICON_BG = '#0d0c0b'
const SPLASH_LIGHT = '#faf8f5' // --black du thème clair
const SPLASH_DARK = '#0a0a0a' //  --black du thème sombre
const MARK_COLOR = '#ff5a1f'

/** Le W, dans un carré de 512 (centré sur 256, 258). */
const MARK = `<polyline points="140,176 188,340 256,236 324,340 372,176" fill="none" stroke="${MARK_COLOR}"
  stroke-width="46" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="square"/>`

/**
 * Le W à `scale` du carré, centré. Icône adaptative : le masque (cercle,
 * goutte…) ne garde que les 66 % du centre ; à 0,8 le W y tient entier.
 */
function svg(size, { background, scale }) {
  const bg = background ? `<rect width="512" height="512" fill="${background}"/>` : ''
  const t = `translate(256 256) scale(${scale}) translate(-256 -258)`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${bg}<g transform="${t}">${MARK}</g></svg>`
}

const FILES = [
  { name: 'icon-only.png', size: 1024, background: ICON_BG, scale: 1 },
  { name: 'icon-foreground.png', size: 1024, background: null, scale: 0.8 },
  { name: 'icon-background.png', size: 1024, background: ICON_BG, scale: 0 },
  { name: 'splash.png', size: 2732, background: SPLASH_LIGHT, scale: 0.22 },
  { name: 'splash-dark.png', size: 2732, background: SPLASH_DARK, scale: 0.22 }
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const f of FILES) {
  const body = f.scale === 0 ? svg(f.size, { background: f.background, scale: 0.0001 }) : svg(f.size, f)
  await page.setViewportSize({ width: f.size, height: f.size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`)
  await page.locator('svg').screenshot({ path: resolve(OUT, f.name), omitBackground: !f.background })
  console.log(`assets/${f.name} (${f.size}×${f.size})`)
}
await browser.close()

execSync(
  'npx --yes @capacitor/assets@4.0.0 generate --android --assetPath assets' +
    ` --iconBackgroundColor "${ICON_BG}" --iconBackgroundColorDark "${ICON_BG}"` +
    ` --splashBackgroundColor "${SPLASH_LIGHT}" --splashBackgroundColorDark "${SPLASH_DARK}"`,
  { cwd: ROOT, stdio: 'inherit' }
)
