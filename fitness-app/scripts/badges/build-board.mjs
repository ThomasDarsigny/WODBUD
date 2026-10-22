/**
 * Planche de présentation de la collection : les 20 badges par catégorie,
 * sur fond sombre et sur fond clair, plus un test de lisibilité en petit.
 *
 * Usage : node scripts/badges/build-board.mjs (après build-badges.mjs)
 * Sortie : design/badges/planche.html (les SVG sont intégrés : fichier autonome)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/badges/manifest.json'), 'utf8'))
const svg = (slug) => readFileSync(resolve(ROOT, `public/badges/${slug}.svg`), 'utf8')
const uri = (slug) => `data:image/svg+xml;base64,${Buffer.from(svg(slug)).toString('base64')}`

const RARITY_COLOR = { Commun: '#b3bac2', Rare: '#4c8dff', 'Épique': '#a86bff', 'Légendaire': '#f4c652', Mythique: '#7ff3ff' }
const categories = [...new Set(manifest.map((b) => b.category))]

const card = (b) => `
  <figure class="card">
    <img src="${uri(b.slug)}" alt="${b.name}" width="168" height="168">
    <figcaption>
      <span class="num">${String(b.n).padStart(2, '0')}</span>
      <strong>${b.name}</strong>
      <span class="rar" style="--c:${RARITY_COLOR[b.rarity]}">${b.rarity}</span>
      <small>${b.criterion}</small>
    </figcaption>
  </figure>`

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Badges WODBUD — collection Forge</title>
<style>
  :root { --bg: #0b0a0c; --panel: #141217; --ink: #f2ede6; --muted: #9d958a; --line: #2a2630; }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; padding: 40px 32px 56px; }
  header { max-width: 1240px; margin: 0 auto 28px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
  h1 { font: 900 44px/1 'Barlow Condensed', 'Arial Narrow', sans-serif; letter-spacing: .02em; text-transform: uppercase; }
  h1 span { color: #ff5a1f; }
  header p { color: var(--muted); max-width: 52ch; }
  .legend { display: flex; gap: 8px; flex-wrap: wrap; }
  .legend span, .rar { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); }
  section { max-width: 1240px; margin: 0 auto 28px; }
  h2 { font-size: 13px; letter-spacing: .22em; text-transform: uppercase; color: #ff5a1f; margin: 0 0 12px; }
  .row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .card { background: radial-gradient(120% 90% at 50% 0%, #1d1a22, var(--panel)); border: 1px solid var(--line); border-radius: 18px; padding: 18px 14px 16px; display: grid; justify-items: center; gap: 10px; text-align: center; }
  .card img { width: 168px; height: 168px; filter: drop-shadow(0 10px 18px rgba(0,0,0,.55)); }
  figcaption { display: grid; justify-items: center; gap: 4px; }
  .num { font-size: 11px; color: var(--muted); letter-spacing: .1em; }
  figcaption strong { font: 800 20px/1.05 'Barlow Condensed', 'Arial Narrow', sans-serif; text-transform: uppercase; letter-spacing: .03em; }
  figcaption small { color: var(--muted); font-size: 12px; line-height: 1.35; min-height: 2.7em; }
  .light { background: #f3f0ea; color: #17150f; border-radius: 22px; padding: 22px; }
  .light h2 { color: #c23c00; }
  .strip { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
  .strip img { width: 72px; height: 72px; }
  .sizes { display: grid; grid-template-columns: repeat(3, auto 1fr); gap: 14px 18px; align-items: center; }
  .sizes span { color: var(--muted); font-size: 12px; white-space: nowrap; }
  .sizes div { display: flex; flex-wrap: wrap; gap: 8px; }
  .s48 img { width: 48px; height: 48px; } .s32 img { width: 32px; height: 32px; } .s24 img { width: 24px; height: 24px; }
</style></head><body>
<header>
  <div><h1>Collection <span>Forge</span></h1><p>20 badges · métal forgé, émail et pierres taillées. La rareté se lit dans la construction : rebords, gemmes, ornements et halo — pas seulement dans la couleur.</p></div>
  <div class="legend">${Object.entries(RARITY_COLOR).map(([k, c]) => `<span style="--c:${c}">${k}</span>`).join('')}</div>
</header>
${categories.map((cat) => `<section><h2>${cat}</h2><div class="row">${manifest.filter((b) => b.category === cat).map(card).join('')}</div></section>`).join('')}
<section class="light"><h2>Sur fond clair</h2><div class="strip">${manifest.map((b) => `<img src="${uri(b.slug)}" alt="${b.name}">`).join('')}</div></section>
<section><h2>Lisibilité en petit</h2><div class="sizes">
  <span>48 px</span><div class="s48">${manifest.map((b) => `<img src="${uri(b.slug)}" alt="">`).join('')}</div>
  <span>32 px</span><div class="s32">${manifest.map((b) => `<img src="${uri(b.slug)}" alt="">`).join('')}</div>
  <span>24 px</span><div class="s24">${manifest.map((b) => `<img src="${uri(b.slug)}" alt="">`).join('')}</div>
</div></section>
</body></html>
`
mkdirSync(resolve(ROOT, 'design/badges'), { recursive: true })
writeFileSync(resolve(ROOT, 'design/badges/planche.html'), html)
console.log('planche → design/badges/planche.html')
