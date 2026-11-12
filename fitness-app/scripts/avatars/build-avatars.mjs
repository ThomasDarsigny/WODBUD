/**
 * Avatars de l'assistant IA — collection « Forge » (6.8).
 *
 * Même système visuel que les badges (scripts/badges/build-badges.mjs) :
 * rebord en métal, face en émail, symbole métallique avec ombre et filet de
 * lumière, lumière venant d'en haut à gauche. Tous ronds, pour se lire comme
 * un avatar même à 32 px.
 *
 * Usage : node scripts/avatars/build-avatars.mjs
 * Sortie : public/avatars/<id>.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(import.meta.dirname, '../../public/avatars')
const C = 128

const r2 = (n) => Math.round(n * 100) / 100
const pt = (r, deg, cx = C, cy = C) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]

function roundedPoly(points, round = 0) {
  if (!round) return 'M' + points.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' L') + ' Z'
  const n = points.length
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = points[i]
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    const toward = (a, b, dist) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      const k = Math.min(dist, len / 2) / len
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
    }
    const a = toward(p, prev, round)
    const b = toward(p, next, round)
    d += `${i === 0 ? 'M' : 'L'}${r2(a[0])} ${r2(a[1])} Q${r2(p[0])} ${r2(p[1])} ${r2(b[0])} ${r2(b[1])} `
  }
  return d + 'Z'
}
const poly = (pts, round = 0) => roundedPoly(pts, round)
const circle = (r, cx = C, cy = C) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
const rect = (x, y, w, h, rr = 0) => (rr ? roundedPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], rr) : `M${x} ${y} H${x + w} V${y + h} H${x} Z`)
const star = (n, ro, ri, rot = -90, round = 0, cx = C, cy = C) =>
  roundedPoly(Array.from({ length: n * 2 }, (_, i) => pt(i % 2 ? ri : ro, rot + (180 / n) * i, cx, cy)), round)
/** Anneau (trou par règle pair-impair). */
const ring = (ro, ri, cx = C, cy = C) => circle(ro, cx, cy) + ' ' + circle(ri, cx, cy)

const M = {
  iron: ['#b4b9bf', '#6b7178', '#2b2f34', '#8d939a', '#3a3f45'],
  steel: ['#f5f7f9', '#b3bac2', '#5f666e', '#cfd4da', '#6d747c'],
  silver: ['#ffffff', '#e1e5ea', '#9aa2ab', '#f3f5f7', '#8b939c'],
  titanium: ['#e6e9ee', '#8f97a4', '#3f4552', '#b7bec9', '#545b67'],
  gold: ['#fff6cf', '#f4c652', '#a8731b', '#ffdf86', '#7d5310'],
  whiteGold: ['#ffffff', '#eef1f6', '#a9b3c3', '#ffffff', '#8792a5'],
  bronze: ['#ffe2c2', '#d08a4e', '#7a4318', '#e9a86a', '#5e3210']
}
const FACE = {
  graphite: ['#454b54', '#1c1f24', '#0e1013'],
  cobalt: ['#3d7bff', '#1238a8', '#071647'],
  cyan: ['#4fe3ff', '#0b84b8', '#04304a'],
  violet: ['#a46bff', '#4b1aa6', '#170638'],
  crimson: ['#ff5a4a', '#a1101e', '#3b030a'],
  obsidian: ['#3a3346', '#120f18', '#050407'],
  olive: ['#7d8c45', '#36421a', '#12170a'],
  ember: ['#ff8a3d', '#a83a0b', '#3a1203']
}
const DARK_EDGE = '#09090b'

function defs(id, a) {
  const lin = (name, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
    `<linearGradient id="${id}-${name}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${r2(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`
  const rad = (name, stops, cx = 0.35, cy = 0.3, r = 0.85) =>
    `<radialGradient id="${id}-${name}" cx="${cx}" cy="${cy}" r="${r}">${stops.map((c, i) => `<stop offset="${r2(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</radialGradient>`
  return [
    lin('rim', M[a.rim], 0.1, 0, 0.9, 1),
    rad('face', FACE[a.face]),
    lin('glyph', M[a.metal], 0.2, 0, 0.8, 1),
    lin('edge', ['#ffffff', '#ffffff00', '#00000000', '#000000'], 0, 0, 0, 1),
    rad('sheen', ['#ffffffaa', '#ffffff00'], 0.4, 0.15, 0.6),
    rad('eye', a.eye ?? ['#e6fbff', '#4fe3ff', '#0b5a8a'], 0.35, 0.3, 0.75)
  ].join('')
}

function render(a) {
  const id = `avatar-${a.id}`
  const shape = circle(118)
  const inset = (d, s) => `<path d="${d}" transform="translate(${C} ${C}) scale(${s}) translate(${-C} ${-C})"`
  const g = a.glyph(id)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="${a.name}">` +
    `<title>${a.name}</title><defs>${defs(id, a)}</defs>` +
    `<g id="${id}-rim"><path d="${shape}" fill="url(#${id}-rim)" stroke="${DARK_EDGE}" stroke-width="3"/>` +
    `${inset(shape, 0.955)} fill="none" stroke="url(#${id}-edge)" stroke-width="2.4" opacity="0.7"/></g>` +
    `<g id="${id}-face">${inset(shape, 0.86)} fill="url(#${id}-face)" stroke="${DARK_EDGE}" stroke-width="2"/></g>` +
    `<g id="${id}-glyph"><g transform="translate(2.5 3.5)" fill="#000" opacity="0.55">${g.replaceAll(/fill="[^"]*"/g, '')}</g>` +
    `<g fill="url(#${id}-glyph)" stroke="${DARK_EDGE}" stroke-width="1.6" stroke-linejoin="round">${g}</g>` +
    (a.extra ? a.extra(id) : '') + '</g>' +
    `<g id="${id}-sheen"><clipPath id="${id}-clip">${inset(shape, 0.86)}/></clipPath>` +
    `<ellipse cx="${C - 18}" cy="${C - 58}" rx="96" ry="54" fill="url(#${id}-sheen)" clip-path="url(#${id}-clip)" opacity="0.3"/></g>` +
    '</svg>\n'
}

const P = (d, extra = '') => `<path d="${d}" fill="x"${extra}/>`
const EO = ' fill-rule="evenodd"'

const AVATARS = [
  // L'enclume et le marteau : la forge, l'avatar par défaut.
  { id: 'forge', name: 'Forge', rim: 'bronze', face: 'obsidian', metal: 'gold',
    glyph: () =>
      P(poly([[70, 118], [96, 118], [96, 112], [190, 112], [190, 124], [168, 134], [158, 152], [174, 168], [84, 168], [100, 152], [92, 136], [70, 130]], 3)) +
      P(poly([[118, 60], [166, 92], [158, 104], [110, 72]], 3)) + P(poly([[100, 64], [128, 46], [140, 64], [112, 82]], 3)) },
  // Casque à cimier : le guerrier qui ne lâche rien.
  { id: 'titan', name: 'Titan', rim: 'steel', face: 'crimson', metal: 'silver',
    glyph: () =>
      P('M128 66 C164 66 184 94 184 132 L184 172 C184 182 178 188 168 188 L140 188 L140 136 L162 136 L162 118 L94 118 L94 136 L116 136 L116 188 L88 188 C78 188 72 182 72 172 L72 132 C72 94 92 66 128 66 Z') +
      P('M84 84 C92 40 164 40 172 84 L160 88 C152 60 104 60 96 88 Z') },
  // Fleur de lotus : le calme.
  { id: 'zen', name: 'Zen', rim: 'silver', face: 'cyan', metal: 'whiteGold',
    glyph: () =>
      [-60, -30, 0, 30, 60].map((a) => `<ellipse cx="128" cy="116" rx="13" ry="38" transform="rotate(${a} 128 152)" fill="x"/>`).join('') +
      P(rect(84, 160, 88, 10, 5)) },
  // Galons et étoile : le sergent.
  { id: 'sergent', name: 'Sergent', rim: 'iron', face: 'olive', metal: 'silver',
    glyph: () =>
      P(star(5, 24, 10, -90, 1.5, 128, 76)) +
      [112, 142].map((y) => P(poly([[80, y + 20], [128, y - 6], [176, y + 20], [176, y + 38], [128, y + 12], [80, y + 38]], 2))).join('') },
  // L'éclair : l'énergie.
  { id: 'eclair', name: 'Éclair', rim: 'gold', face: 'cobalt', metal: 'gold',
    glyph: () => P(poly([[138, 54], [90, 136], [124, 136], [108, 202], [170, 108], [136, 108], [164, 54]], 3)) },
  // Le robot : l'assistant qui garde le sourire.
  { id: 'robot', name: 'Robot', rim: 'titanium', face: 'violet', metal: 'silver',
    glyph: () =>
      P(rect(80, 86, 96, 80, 18)) + P(rect(124, 62, 8, 26, 2)) + P(circle(9, 128, 58)) +
      P(rect(70, 112, 12, 28, 4)) + P(rect(174, 112, 12, 28, 4)),
    extra: (id) =>
      `<circle cx="108" cy="118" r="11" fill="url(#${id}-eye)" stroke="${DARK_EDGE}" stroke-width="1.6"/>` +
      `<circle cx="148" cy="118" r="11" fill="url(#${id}-eye)" stroke="${DARK_EDGE}" stroke-width="1.6"/>` +
      `<path d="M106 144 Q128 158 150 144" fill="none" stroke="${DARK_EDGE}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="104" cy="114" r="3.5" fill="#fff" opacity="0.8"/><circle cx="144" cy="114" r="3.5" fill="#fff" opacity="0.8"/>` },
  // Le kettlebell : l'outil du quotidien.
  { id: 'kettlebell', name: 'Kettlebell', rim: 'steel', face: 'graphite', metal: 'silver',
    glyph: () => P('M100 96 C100 66 156 66 156 96 L156 104 L144 104 L144 96 C144 82 112 82 112 96 L112 104 L100 104 Z') + P(circle(46, 128, 144)) },
  // La flamme : celle qui ne s'éteint pas.
  { id: 'flamme', name: 'Flamme', rim: 'gold', face: 'ember', metal: 'gold',
    glyph: () => P('M128 50 C152 82 178 102 172 140 C168 168 150 188 128 190 C106 188 88 168 84 140 C80 112 100 98 108 76 C114 94 120 102 128 110 C124 90 122 72 128 50 Z'),
    extra: (id) => `<path d="M128 104 C140 124 148 136 146 154 C144 168 138 176 128 178 C118 176 112 168 110 154 C108 140 118 126 128 104 Z" fill="url(#${id}-face)" opacity="0.9"/>` }
]

mkdirSync(OUT, { recursive: true })
for (const a of AVATARS) {
  // Le kettlebell et autres formes trouées n'en ont pas besoin ici ; la règle
  // pair-impair reste disponible (EO, ring) pour un futur avatar.
  void EO; void ring
  writeFileSync(resolve(OUT, `${a.id}.svg`), render(a))
}
console.log(`${AVATARS.length} avatars écrits dans public/avatars/`)
