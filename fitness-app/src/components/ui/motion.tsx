import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { animate, motion, useReducedMotion } from 'motion/react'

/**
 * Mouvement de l'app — la même signature que la landing, en plus sobre :
 * on s'en sert tous les jours, il doit aider sans ralentir.
 * Seuls transform et opacity bougent, et tout se coupe avec
 * « réduire les animations ».
 */

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Entrée de chaque écran : un fondu qui monte de quelques pixels. Pas de
 * sortie animée — changer d'onglet doit rester instantané.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}

/** Un nombre qui défile jusqu'à sa valeur, depuis la précédente. */
const ROUND = (n: number) => String(Math.round(n))

export function AnimatedNumber({ value, format = ROUND, duration = 1.1 }: {
  value: number
  format?: (n: number) => string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduce) { el.textContent = format(value); from.current = value; return }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => { el.textContent = format(v) }
    })
    from.current = value
    return () => controls.stop()
  }, [value, format, duration, reduce])

  // Le texte final est là dès le rendu : lecteurs d'écran et captures le voient.
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{format(value)}</span>
}

const COLORS = ['#ff5a1f', '#ffb38f', '#4ade80', '#38bdf8', '#facc15', '#f5f5f4']

/**
 * Éclat de confettis, une seule fois, quand une séance est enregistrée.
 * Décoratif : masqué aux lecteurs d'écran, absent si on réduit les animations.
 */
export function Celebrate({ big = false }: { big?: boolean }) {
  const reduce = useReducedMotion()
  const bits = useMemo(() => {
    const n = big ? 42 : 24
    // Pseudo-aléatoire déterministe : même rendu à chaque fois, et pas de
    // Math.random() pendant le rendu.
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.35
      const dist = (big ? 150 : 110) + ((i * 37) % 70)
      return {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist * 0.75 - 40,
        r: ((i * 53) % 360) - 180,
        c: COLORS[i % COLORS.length],
        w: 6 + (i % 3) * 2,
        d: (i % 5) * 0.03
      }
    })
  }, [big])
  if (reduce) return null
  return (
    <div aria-hidden="true" className="wb-confetti">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          style={{ background: b.c, width: b.w, height: b.w * 0.45 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 140], opacity: [1, 1, 0], rotate: b.r * 3, scale: 1 }}
          transition={{ duration: 1.5, delay: b.d, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  )
}

/** Apparition « ressort » d'un élément important (gros chiffre, carte de record). */
export function Pop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22, delay }}
    >
      {children}
    </motion.div>
  )
}
