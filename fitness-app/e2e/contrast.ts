import type { Page } from '@playwright/test'

/**
 * Contraste réel de chaque texte visible (4.4) : sa couleur, composée sur son fond
 * effectif (couches semi-transparentes empilées, opacité des parents appliquée).
 * Renvoie ce qui passe sous 4,5:1 (3:1 pour un grand texte), hors contrôles
 * désactivés, que les WCAG exemptent. Un fond en dégradé est lu par sa couleur unie.
 */
export async function lowContrast(page: Page): Promise<string[]> {
  // Le fondu d'entrée des pages ne compte pas : on mesure l'état final.
  await page.addStyleTag({ content: '.wb-page-fill { opacity: 1 !important; transform: none !important; }' })
  await page.waitForTimeout(100)
  return page.evaluate(() => {
    // Les entrées en cascade (listes qui apparaissent ligne par ligne) : on mesure leur état final.
    for (const a of document.getAnimations()) { try { a.finish() } catch { /* animation infinie */ } }
    const parse = (s: string): number[] | null => {
      let m = s.match(/rgba?\(([^)]+)\)/)
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
      m = s.match(/color\(srgb ([^)]+)\)/)
      if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] }
      return null
    }
    const over = (top: number[], bottom: number[]) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1) }
    const lum = (c: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
    const background = (el: Element) => {
      const chain: Element[] = []
      for (let e: Element | null = el; e; e = e.parentElement) chain.push(e)
      let bg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]
      if (bg[3] < 1) bg = over(bg, [255, 255, 255, 1])
      for (const e of chain.reverse()) {
        const c = parse(getComputedStyle(e).backgroundColor)
        if (c && c[3] > 0) bg = over(c, bg)
      }
      return bg
    }
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim()
      const el = n.parentElement
      if (!el || text.length < 2) continue
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden') continue
      if (el.closest('input, textarea, select, option, svg, [aria-hidden="true"], button:disabled, [aria-disabled="true"]')) continue
      let opacity = 1
      for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity)
      if (opacity < 0.05) continue
      const fg = parse(s.color)
      if (!fg) continue
      const bg = background(el)
      const cr = ratio(over([fg[0], fg[1], fg[2], fg[3] * opacity], bg), bg)
      const size = parseFloat(s.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
      if (cr + 0.005 < (large ? 3 : 4.5)) out.push(`${cr.toFixed(2)}:1 « ${text.slice(0, 40)} » (${String(el.className).slice(0, 50) || el.tagName.toLowerCase()})`)
    }
    return out
  })
}
