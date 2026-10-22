/**
 * Collection de badges WODBUD — direction « Forge ».
 *
 * Génère les 20 badges en SVG à partir d'un seul système visuel : mêmes
 * matériaux, même lumière (source en haut à gauche), même épaisseur de rebord,
 * même traitement du symbole. Chaque badge garde sa propre silhouette et son
 * propre symbole ; la rareté se lit dans la construction (rebords, gemmes,
 * ornements, halo), pas seulement dans la couleur.
 *
 * Usage : node scripts/badges/build-badges.mjs
 * Sortie : public/badges/<slug>.svg + public/badges/manifest.json
 *
 * Chaque SVG est découpé en calques nommés (#<slug>-aura, -ornament, -rim,
 * -face, -glyph, -sheen, -gems) pour pouvoir animer un déblocage plus tard :
 * apparition, reflet qui balaie, halo qui pulse.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(import.meta.dirname, '../../public/badges')
const C = 128 // centre du canevas 256 × 256

/* ── Géométrie ──────────────────────────────────────────────────────────── */

const r2 = (n) => Math.round(n * 100) / 100
const pt = (r, deg, cx = C, cy = C) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)]

/** Polygone à coins arrondis (arrondi en courbes quadratiques). */
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

const regular = (n, r, rot = -90, round = 0) => roundedPoly(Array.from({ length: n }, (_, i) => pt(r, rot + (360 / n) * i)), round)
const star = (n, ro, ri, rot = -90, round = 0) =>
  roundedPoly(Array.from({ length: n * 2 }, (_, i) => pt(i % 2 ? ri : ro, rot + (180 / n) * i)), round)
const circle = (r, cx = C, cy = C) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`

/** Engrenage : dents trapézoïdales. */
function gear(teeth, ro, ri, round = 3) {
  const pts = []
  const step = 360 / teeth
  for (let i = 0; i < teeth; i++) {
    const a = -90 + step * i
    pts.push(pt(ri, a - step * 0.5), pt(ri, a - step * 0.26), pt(ro, a - step * 0.16), pt(ro, a + step * 0.16), pt(ri, a + step * 0.26))
  }
  return roundedPoly(pts, round)
}

/** Secteur d'anneau (pour anneaux segmentés et flèches de cycle). */
function arcBand(r1, r2_, a0, a1) {
  const large = a1 - a0 > 180 ? 1 : 0
  const [x0, y0] = pt(r2_, a0), [x1, y1] = pt(r2_, a1), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r1, a0)
  return `M${r2(x0)} ${r2(y0)} A${r2_} ${r2_} 0 ${large} 1 ${r2(x1)} ${r2(y1)} L${r2(x2)} ${r2(y2)} A${r1} ${r1} 0 ${large} 0 ${r2(x3)} ${r2(y3)} Z`
}

const rect = (x, y, w, h, rr = 0) =>
  rr ? roundedPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], rr) : `M${x} ${y} H${x + w} V${y + h} H${x} Z`
const poly = (pts, round = 0) => roundedPoly(pts, round)
const mirrorX = (pts) => pts.map(([x, y]) => [2 * C - x, y])

/* ── Matériaux ──────────────────────────────────────────────────────────── */
// Chaque matériau : un dégradé de rebord (métal), une face (émail / pierre),
// un métal de symbole. La lumière vient toujours d'en haut à gauche.

const M = {
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
  indigo: ['#5a5cff', '#211a8f', '#0a0833'],
  violet: ['#a46bff', '#4b1aa6', '#170638'],
  crimson: ['#ff5a4a', '#a1101e', '#3b030a'],
  obsidian: ['#3a3346', '#120f18', '#050407'],
  cosmos: ['#7cf4ff', '#5b3bff', '#0a0420']
}
const GEM = {
  sapphire: ['#e6f0ff', '#4c8dff', '#0b2c8f'],
  amethyst: ['#f3e6ff', '#a86bff', '#3f0f8f'],
  ruby: ['#ffe1e1', '#ff3a4f', '#7a0016'],
  diamond: ['#ffffff', '#bdf6ff', '#5aa9ff'],
  topaz: ['#fff8d6', '#ffb020', '#8a4a00']
}

function defs(id, b) {
  const lin = (name, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1) =>
    `<linearGradient id="${id}-${name}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${r2(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`
  const rad = (name, stops, cx = 0.35, cy = 0.3, r = 0.85) =>
    `<radialGradient id="${id}-${name}" cx="${cx}" cy="${cy}" r="${r}">${stops.map((c, i) => `<stop offset="${r2(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</radialGradient>`
  return [
    lin('rim', M[b.rim], 0.1, 0, 0.9, 1),
    lin('rim2', M[b.rim2 ?? b.rim], 0.9, 0, 0.1, 1),
    rad('face', FACE[b.face]),
    lin('glyph', M[b.metal], 0.2, 0, 0.8, 1),
    lin('edge', ['#ffffff', '#ffffff00', '#00000000', '#000000'], 0, 0, 0, 1),
    rad('sheen', ['#ffffffaa', '#ffffff00'], 0.4, 0.15, 0.6),
    b.gem ? rad('gem', GEM[b.gem], 0.35, 0.3, 0.75) : '',
    b.aura ? rad('aura', [b.aura + 'cc', b.aura + '44', b.aura + '00'], 0.5, 0.5, 0.5) : '',
    b.prism ? lin('prism', ['#e8fdff', '#7ff3ff', '#a78bfa', '#ff9ae3', '#fff1b8', '#e8fdff'], 0, 0, 1, 1) : '',
    b.mask ? b.mask(id) : ''
  ].join('')
}

/* ── Rendu d'un badge ───────────────────────────────────────────────────── */

const DARK_EDGE = '#09090b'

function gemAt(id, x, y, r, kind = 'gem') {
  // Gemme taillée : losange facetté + éclat.
  const d = poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], r * 0.18)
  return `<path d="${d}" fill="url(#${id}-${kind})" stroke="${DARK_EDGE}" stroke-width="1.6"/>` +
    `<path d="${poly([[x, y - r], [x + r * 0.45, y - r * 0.15], [x, y + r * 0.1], [x - r * 0.45, y - r * 0.15]])}" fill="#ffffff" opacity="0.35"/>`
}

function render(b) {
  const id = b.slug
  const faceScale = b.faceScale ?? 0.84
  const inset = (d, s) => `<path d="${d}" transform="translate(${C} ${C}) scale(${s}) translate(${-C} ${-C})"`

  const layers = []
  // Halo (épique et au-delà) : derrière tout.
  if (b.aura) layers.push(`<g id="${id}-aura"><circle cx="${C}" cy="${C}" r="${b.auraR ?? 122}" fill="url(#${id}-aura)"/>${b.rays ?? ''}</g>`)
  // Ornements (ailes, lauriers, lames) : derrière le rebord.
  if (b.ornament) layers.push(`<g id="${id}-ornament">${b.ornament(id)}</g>`)

  // Rebord : silhouette pleine en métal, arête sombre pour fond clair.
  layers.push(`<g id="${id}-rim"><path d="${b.shape}" fill="url(#${id}-rim)" stroke="${DARK_EDGE}" stroke-width="3" stroke-linejoin="round"/>` +
    // Biseau : liseré clair en haut, sombre en bas.
    `${inset(b.shape, 0.955)} fill="none" stroke="url(#${id}-edge)" stroke-width="2.4" opacity="0.7"/>` +
    // Second rebord (rare et au-delà) : profondeur.
    (b.doubleRim ? `${inset(b.shape, 0.9)} fill="url(#${id}-rim2)" stroke="${DARK_EDGE}" stroke-width="1.6"/>` : '') +
    '</g>')

  // Face : émail ou pierre, avec ombre portée du rebord.
  layers.push(`<g id="${id}-face">${inset(b.shape, faceScale)} fill="url(#${id}-face)" stroke="${DARK_EDGE}" stroke-width="2"/>` +
    (b.accentRing ? `${inset(b.shape, faceScale - 0.06)} fill="none" stroke="${b.accentRing}" stroke-width="1.6" opacity="0.75"/>` : '') +
    (b.faceDetail ? b.faceDetail(id) : '') +
    '</g>')

  // Symbole : ombre décalée, métal, filet de lumière.
  const g = b.glyph(id)
  layers.push(`<g id="${id}-glyph">` +
    `<g transform="translate(2.5 3.5)" fill="#000" opacity="0.55">${g.replaceAll(/fill="[^"]*"/g, '')}</g>` +
    `<g fill="url(#${id}-glyph)" stroke="${DARK_EDGE}" stroke-width="1.6" stroke-linejoin="round">${g}</g>` +
    (b.glyphExtra ? b.glyphExtra(id) : '') +
    '</g>')

  // Reflet : ellipse claire en haut de la face.
  layers.push(`<g id="${id}-sheen"><clipPath id="${id}-clip">${inset(b.shape, faceScale)}/></clipPath>` +
    `<ellipse cx="${C - 18}" cy="${C - 58}" rx="96" ry="54" fill="url(#${id}-sheen)" clip-path="url(#${id}-clip)" opacity="${b.sheen ?? 0.32}"/></g>`)

  if (b.gems) layers.push(`<g id="${id}-gems">${b.gems(id)}</g>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="${b.name}">` +
    `<title>${b.name}</title><defs>${defs(id, b)}</defs>${layers.join('')}</svg>\n`
}

/* ── Symboles (centrés sur 128,128, ~110 px de haut) ────────────────────── */

const P = (d, extra = '') => `<path d="${d}" fill="x"${extra}/>`

const GLYPHS = {
  // Une marche et la flèche qui la franchit : le premier pas.
  premierPas: () => P(poly([[128, 74], [168, 120], [142, 120], [142, 146], [114, 146], [114, 120], [88, 120]], 3)) + P(rect(82, 154, 92, 16, 4)),
  // Cinq segments complets autour d'un noyau : cinq séances, la boucle se ferme.
  habitude: () => [0, 1, 2, 3, 4].map((i) => P(arcBand(36, 50, -90 + i * 72 + 7, -90 + i * 72 + 65))).join('') + P(circle(22)),
  // Fronton et colonnes : la discipline comme architecture.
  discipline: () => P(poly([[80, 98], [128, 68], [176, 98]], 2)) + [90, 120, 150].map((x) => P(rect(x, 104, 16, 48, 2))).join('') + P(rect(80, 156, 96, 14, 3)),
  // Flamme taillée comme une gemme.
  devouement: () => P('M128 62 C150 90 174 108 168 142 C164 166 148 182 128 184 C108 182 92 166 88 142 C84 118 102 104 110 84 C116 100 122 108 128 114 C124 96 122 80 128 62 Z'),
  // Écrou hexagonal : l'organe d'une machine.
  machine: () => P(regular(6, 40, 0, 4)) ,
  // Barre chargée.
  premiereSerie: () => P(rect(66, 122, 124, 12, 3)) + P(rect(84, 98, 14, 60, 4)) + P(rect(100, 108, 10, 40, 3)) + P(rect(158, 98, 14, 60, 4)) + P(rect(146, 108, 10, 40, 3)),
  // Trois chevrons de grade.
  perseverance: () => [72, 102, 132].map((y) => P(poly([[84, y + 22], [128, y - 2], [172, y + 22], [172, y + 40], [128, y + 16], [84, y + 40]], 2))).join(''),
  // Pile de disques : la masse.
  volume: () => [[76, 152, 104, 20], [84, 130, 88, 18], [92, 110, 72, 16], [100, 92, 56, 14]].map(([x, y, w, h]) => P(rect(x, y, w, h, 6))).join(''),
  // Sommet et drapeau planté.
  record: () => P(poly([[72, 170], [118, 96], [134, 120], [148, 104], [184, 170]], 3)) + P(rect(114, 60, 6, 40, 1)) + P(poly([[120, 60], [150, 69], [120, 78]], 1)),
  // La flèche qui traverse la barre et la brise.
  depassement: () => P(rect(66, 124, 46, 14, 3)) + P(rect(144, 124, 46, 14, 3)) + P(poly([[128, 60], [160, 100], [138, 100], [138, 182], [118, 182], [118, 100], [96, 100]], 3)) + P(poly([[106, 112], [100, 104], [110, 108]])) + P(poly([[150, 112], [156, 104], [146, 108]])),
  // Étincelle à quatre branches : l'éveil.
  eveil: () => P('M128 64 Q134 122 192 128 Q134 134 128 192 Q122 134 64 128 Q122 122 128 64 Z') + P('M166 82 Q168 96 182 98 Q168 100 166 114 Q164 100 150 98 Q164 96 166 82 Z'),
  // Barres qui montent.
  evolution: () => P(rect(88, 140, 20, 30, 3)) + P(rect(118, 116, 20, 54, 3)) + P(rect(148, 90, 20, 80, 3)) + P(poly([[146, 82], [158, 64], [170, 82]], 1)),
  // L'éclair.
  puissance: () => P(poly([[136, 58], [92, 136], [124, 136], [108, 198], [166, 108], [134, 108], [162, 58]], 3)),
  // Deux flèches qui se poursuivent : le cycle.
  constance: () => P(arcBand(30, 44, 200, 330)) + P(poly([[...pt(37, 330)].map((v, i) => v + (i ? -16 : 4)), pt(54, 342), pt(20, 342)].map((p) => p))) +
    P(arcBand(30, 44, 20, 150)) + P(poly([[...pt(37, 150)].map((v, i) => v + (i ? 16 : -4)), pt(54, 162), pt(20, 162)])) + P(circle(10)),
  // Cristal qui émerge : la transformation.
  transformation: () => P(poly([[128, 58], [156, 88], [156, 154], [128, 186], [100, 154], [100, 88]], 2)),
  // Soleil levant sur l'horizon.
  leveTot: () => P(rect(70, 152, 116, 10, 3)) + P('M94 146 A34 34 0 0 1 162 146 Z') +
    [-150, -120, -90, -60, -30].map((a) => { const [x1, y1] = pt(46, a, C, 146); const [x2, y2] = pt(70, a, C, 146); const [px, py] = pt(5, a + 90, 0, 0); return P(poly([[x1 + px, y1 + py], [x2, y2], [x1 - px, y1 - py]], 1)) }).join(''),
  // Croissant et étoile (le croissant est découpé par un masque).
  nocturne: (id) => `<path d="${circle(40, 120, 132)}" fill="x" mask="url(#${id}-moon)"/>` + P('M160 80 Q162 94 176 96 Q162 98 160 112 Q158 98 144 96 Q158 94 160 80 Z'),
  // Cible et flèche plantée.
  sansRelache: () => P(arcBand(32, 46, 0, 359.9)) + P(arcBand(12, 22, 0, 359.9)) + P(circle(6)) + P(poly([[124, 126], [176, 74], [182, 80], [130, 132]], 1)) + P(poly([[170, 66], [190, 60], [184, 80]], 1)),
  // Diamant brillant : indestructible.
  invincible: () => P(poly([[98, 92], [158, 92], [180, 114], [128, 184], [76, 114]], 2)),
  // Couronne.
  legende: () => P(poly([[84, 152], [76, 96], [106, 124], [128, 84], [150, 124], [180, 96], [172, 152]], 3)) + P(rect(82, 156, 92, 16, 4))
}

/* ── Détails propres à certains symboles ────────────────────────────────── */

const facetLines = (pairs, color = '#ffffff', op = 0.55, w = 1.4) =>
  pairs.map(([[x1, y1], [x2, y2]]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`).join('')

const EXTRA = {
  machine: (id) => `<circle cx="${C}" cy="${C}" r="17" fill="url(#${id}-gem)" stroke="${DARK_EDGE}" stroke-width="2"/><circle cx="${C - 5}" cy="${C - 6}" r="5" fill="#fff" opacity="0.55"/>`,
  devouement: (id) => `<path d="M128 98 C138 116 146 128 144 146 C142 160 136 168 128 170 C120 168 114 160 112 146 C110 132 120 120 128 98 Z" fill="url(#${id}-gem)" opacity="0.95"/>`,
  transformation: () => facetLines([[[128, 58], [128, 186]], [[100, 88], [128, 108]], [[156, 88], [128, 108]], [[100, 154], [128, 140]], [[156, 154], [128, 140]]], '#ffffff', 0.5),
  invincible: () => facetLines([[[76, 114], [180, 114]], [[98, 92], [112, 114]], [[128, 92], [112, 114]], [[128, 92], [144, 114]], [[158, 92], [144, 114]], [[112, 114], [128, 184]], [[144, 114], [128, 184]]], '#ffffff', 0.7, 1.6),
  legende: (id) => gemAt(id, 76, 92, 7) + gemAt(id, 128, 80, 8) + gemAt(id, 180, 92, 7) + gemAt(id, 128, 164, 6),
  record: () => `<path d="M118 96 L126 108 L118 106 L110 110 Z" fill="#ffffff" opacity="0.8"/>`
}

/* ── Ornements de rareté ────────────────────────────────────────────────── */

// Rayons d'aura (mythique) : fins faisceaux alternés.
const rays = (id, n, ri, ro, color, op = 0.5) =>
  Array.from({ length: n }, (_, i) => {
    const a = (360 / n) * i - 90
    const w = i % 2 ? 2.5 : 5
    return `<path d="${poly([pt(ri, a - w), pt(ro, a), pt(ri, a + w)])}" fill="${color}" opacity="${i % 2 ? op * 0.5 : op}"/>`
  }).join('')

// Laurier : feuilles en éventail le long d'un arc.
function laurel(id, side, fill) {
  const leaves = []
  for (let i = 0; i < 7; i++) {
    const a = side < 0 ? 110 + i * 19 : 70 - i * 19
    const [x, y] = pt(110, a)
    const rot = a + (side < 0 ? 60 : -60) + 90
    leaves.push(`<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="7" ry="15" transform="rotate(${r2(rot)} ${r2(x)} ${r2(y)})" fill="${fill}" stroke="${DARK_EDGE}" stroke-width="1.4"/>`)
  }
  return leaves.join('')
}

// Lames angulaires (transformation).
const blades = (id) => {
  const left = [[70, 104], [14, 74], [40, 122], [8, 138], [56, 150], [34, 178], [82, 160]]
  return `<path d="${poly(left, 3)}" fill="url(#${id}-rim)" stroke="${DARK_EDGE}" stroke-width="2.4"/>` +
    `<path d="${poly(mirrorX(left), 3)}" fill="url(#${id}-rim2)" stroke="${DARK_EDGE}" stroke-width="2.4"/>`
}

/* ── La collection ──────────────────────────────────────────────────────── */

const RARITY = {
  commun: { label: 'Commun', order: 1 },
  rare: { label: 'Rare', order: 2 },
  epique: { label: 'Épique', order: 3 },
  legendaire: { label: 'Légendaire', order: 4 },
  mythique: { label: 'Mythique', order: 5 }
}

// Gabarits de rareté : matériaux et construction partagés.
const T = {
  commun: { rim: 'steel', face: 'graphite', metal: 'silver', sheen: 0.28 },
  rare: { rim: 'steel', face: 'cobalt', metal: 'silver', gem: 'sapphire', accentRing: '#9cc2ff', sheen: 0.32 },
  epique: { rim: 'titanium', rim2: 'steel', doubleRim: true, faceScale: 0.8, face: 'violet', metal: 'gold', gem: 'amethyst', aura: '#8b5cf6', auraR: 124, accentRing: '#d8b4fe', sheen: 0.3 },
  legendaire: { rim: 'gold', rim2: 'bronze', doubleRim: true, faceScale: 0.8, face: 'obsidian', metal: 'gold', gem: 'ruby', aura: '#f59e0b', auraR: 126, accentRing: '#f4c652', sheen: 0.34 },
  mythique: { rim: 'whiteGold', rim2: 'titanium', doubleRim: true, faceScale: 0.78, face: 'cosmos', metal: 'whiteGold', gem: 'diamond', prism: true, aura: '#38e1ff', auraR: 127, accentRing: '#c4b5fd', sheen: 0.38 }
}

const topGem = (y, r = 9) => (id) => gemAt(id, C, y, r)

const BADGES = [
  // ── Régularité ──
  { n: 1, slug: 'premier-pas', name: 'Premier pas', cat: 'Régularité', rarity: 'commun', criterion: 'Terminer sa première séance.',
    shape: circle(106), glyph: GLYPHS.premierPas },
  { n: 2, slug: 'habitude', name: 'Habitude', cat: 'Régularité', rarity: 'commun', criterion: 'Terminer 5 séances.',
    shape: star(5, 112, 92, -90, 22), glyph: GLYPHS.habitude },
  { n: 3, slug: 'discipline', name: 'Discipline', cat: 'Régularité', rarity: 'rare', criterion: 'Terminer 10 séances.',
    shape: regular(8, 110, -67.5, 10), glyph: GLYPHS.discipline, gems: topGem(24) },
  { n: 4, slug: 'devouement', name: 'Dévouement', cat: 'Régularité', rarity: 'epique', criterion: 'Terminer 30 séances.',
    shape: star(12, 112, 98, -90, 6), glyph: GLYPHS.devouement, glyphExtra: EXTRA.devouement, gems: topGem(20, 10) },
  { n: 5, slug: 'machine', name: 'Machine', cat: 'Régularité', rarity: 'legendaire', criterion: 'Terminer 100 séances.',
    shape: gear(10, 112, 94), glyph: GLYPHS.machine, glyphExtra: EXTRA.machine,
    rays: '', gems: (id) => [0, 72, 144, 216, 288].map((a) => { const [x, y] = pt(84, a - 90); return gemAt(id, x, y, 6) }).join('') },

  // ── Séries et records ──
  { n: 6, slug: 'premiere-serie', name: 'Première série', cat: 'Séries et records', rarity: 'commun', criterion: 'Effectuer sa première série d’exercices.',
    shape: regular(6, 110, -90, 12), glyph: GLYPHS.premiereSerie },
  { n: 7, slug: 'perseverance', name: 'Persévérance', cat: 'Séries et records', rarity: 'rare', criterion: 'Effectuer 100 séries.',
    shape: poly([[34, 46], [222, 46], [222, 150], [128, 236], [34, 150]], 14), glyph: GLYPHS.perseverance, gems: topGem(46) },
  { n: 8, slug: 'volume', name: 'Volume', cat: 'Séries et records', rarity: 'epique', criterion: 'Effectuer 500 séries.',
    shape: rect(26, 26, 204, 204, 46), glyph: GLYPHS.volume, gems: (id) => gemAt(id, 46, 46, 8) + gemAt(id, 210, 46, 8) + gemAt(id, 46, 210, 8) + gemAt(id, 210, 210, 8) },
  { n: 9, slug: 'record-personnel', name: 'Record personnel', cat: 'Séries et records', rarity: 'rare', criterion: 'Battre un record personnel.',
    face: 'cyan', accentRing: '#a5f3fc', gem: 'diamond',
    shape: poly([[128, 14], [228, 92], [228, 214], [28, 214], [28, 92]], 14), glyph: GLYPHS.record, glyphExtra: EXTRA.record },
  { n: 10, slug: 'depassement', name: 'Dépassement', cat: 'Séries et records', rarity: 'legendaire', criterion: 'Battre 10 records personnels.',
    shape: circle(92), faceScale: 0.78, glyph: GLYPHS.depassement,
    ornament: (id) => laurel(id, -1, `url(#${id}-rim)`) + laurel(id, 1, `url(#${id}-rim2)`), gems: topGem(36, 9) },

  // ── Progression ──
  { n: 11, slug: 'eveil', name: 'Éveil', cat: 'Progression', rarity: 'commun', criterion: 'Commencer son parcours d’entraînement.',
    // Rose des vents : quatre pointes, comme l'étincelle qu'elle porte.
    shape: star(4, 122, 66, -90, 12), faceScale: 0.8, glyph: (id) => `<g transform="translate(128 128) scale(0.82) translate(-128 -128)">${GLYPHS.eveil(id)}</g>` },
  { n: 12, slug: 'evolution', name: 'Évolution', cat: 'Progression', rarity: 'rare', criterion: 'Progresser pendant plusieurs semaines.',
    shape: regular(4, 120, -90, 16), glyph: GLYPHS.evolution, gems: topGem(22) },
  { n: 13, slug: 'puissance', name: 'Puissance', cat: 'Progression', rarity: 'epique', criterion: 'Atteindre un objectif de performance.',
    face: 'crimson', aura: '#ef4444', accentRing: '#fca5a5', gem: 'ruby',
    shape: poly([[28, 40], [228, 40], [212, 140], [128, 236], [44, 140]], 16), glyph: GLYPHS.puissance, gems: (id) => gemAt(id, 44, 52, 8) + gemAt(id, 212, 52, 8) },
  { n: 14, slug: 'constance', name: 'Constance', cat: 'Progression', rarity: 'rare', criterion: 'S’entraîner plusieurs semaines consécutives.',
    shape: poly([[128, 18], [236, 214], [20, 214]], 26), faceScale: 0.8, glyph: (id) => `<g transform="translate(0 22)">${GLYPHS.constance(id)}</g>`, gems: topGem(52, 8) },
  { n: 15, slug: 'transformation', name: 'Transformation', cat: 'Progression', rarity: 'legendaire', criterion: 'Atteindre un objectif important de progression.',
    face: 'crimson', shape: regular(6, 92, -90, 10), faceScale: 0.8, glyph: GLYPHS.transformation, glyphExtra: EXTRA.transformation,
    ornament: blades, gems: topGem(42, 9) },

  // ── Défis ──
  { n: 16, slug: 'leve-tot', name: 'Lève-tôt', cat: 'Défis', rarity: 'rare', criterion: 'Terminer une séance tôt le matin.',
    face: 'cyan', accentRing: '#fde68a', metal: 'gold', gem: 'topaz',
    shape: 'M28 214 L28 128 A100 100 0 0 1 228 128 L228 214 Q228 228 214 228 L42 228 Q28 228 28 214 Z', glyph: GLYPHS.leveTot, gems: topGem(32) },
  { n: 17, slug: 'nocturne', name: 'Nocturne', cat: 'Défis', rarity: 'rare', criterion: 'Terminer une séance tard le soir.',
    face: 'indigo', accentRing: '#c7d2fe', gem: 'amethyst',
    shape: 'M128 14 C196 46 214 92 214 128 C214 164 196 210 128 242 C60 210 42 164 42 128 C42 92 60 46 128 14 Z', faceScale: 0.82,
    glyph: GLYPHS.nocturne, gems: topGem(30, 8),
    mask: (id) => `<mask id="${id}-moon"><rect width="256" height="256" fill="#fff"/><circle cx="140" cy="120" r="34" fill="#000"/></mask>` },
  { n: 18, slug: 'sans-relache', name: 'Sans relâche', cat: 'Défis', rarity: 'epique', criterion: 'Atteindre un objectif hebdomadaire exigeant.',
    shape: star(6, 120, 96, -90, 10), glyph: GLYPHS.sansRelache, gems: topGem(14, 9) },
  { n: 19, slug: 'invincible', name: 'Invincible', cat: 'Défis', rarity: 'mythique', criterion: 'Maintenir une longue série de jours d’entraînement.',
    shape: poly([[46, 44], [80, 60], [128, 22], [176, 60], [210, 44], [214, 140], [128, 238], [42, 140]], 12),
    glyph: GLYPHS.invincible, glyphExtra: EXTRA.invincible, glyphPrism: true,
    rays: null, gems: (id) => gemAt(id, 128, 34, 10, 'gem') + gemAt(id, 50, 52, 7) + gemAt(id, 206, 52, 7) },
  { n: 20, slug: 'legende', name: 'Légende', cat: 'Défis', rarity: 'mythique', criterion: 'Accomplir un défi particulièrement difficile.',
    // La pièce maîtresse : or poli et or blanc, face cosmique, couronne d'or.
    rim: 'gold', rim2: 'whiteGold', metal: 'gold', gem: 'ruby',
    shape: star(8, 118, 96, -90, 8), faceScale: 0.76, glyph: GLYPHS.legende, glyphExtra: EXTRA.legende,
    ornament: (id) => laurel(id, -1, `url(#${id}-rim)`) + laurel(id, 1, `url(#${id}-rim)`) }
]

/* ── Assemblage ─────────────────────────────────────────────────────────── */

mkdirSync(OUT, { recursive: true })
const manifest = []
for (const def of BADGES) {
  const b = { ...T[def.rarity], ...def }
  const glyphFn = def.glyph
  // « fill="x" » marque les formes du symbole : métal, ou prisme pour les mythiques.
  b.glyph = (gid) => glyphFn(gid).replaceAll('fill="x"', b.glyphPrism ? `fill="url(#${gid}-prism)"` : '')
  b.rays = def.rarity === 'mythique' ? rays(def.slug, 24, 96, 127, '#bdf6ff', 0.55)
    : def.rarity === 'legendaire' ? rays(def.slug, 16, 100, 126, '#ffd978', 0.35)
    : ''
  writeFileSync(resolve(OUT, `${def.slug}.svg`), render(b))
  manifest.push({
    n: def.n,
    slug: def.slug,
    name: def.name,
    category: def.cat,
    rarity: RARITY[def.rarity].label,
    rarityOrder: RARITY[def.rarity].order,
    criterion: def.criterion,
    file: `badges/${def.slug}.svg`
  })
}
writeFileSync(resolve(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`${manifest.length} badges → ${OUT}`)
