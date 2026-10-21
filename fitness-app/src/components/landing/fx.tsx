import { Fragment, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import s from './landing.module.css'

/**
 * Effets de la landing (Motion). Règles communes :
 *  - transform / opacity seulement, jamais de propriété de mise en page ;
 *  - ressorts plutôt que courbes fixes ;
 *  - « mouvement réduit » : l'effet est coupé, le contenu reste là.
 */

const SPRING = { stiffness: 260, damping: 26, mass: 0.6 }

/** Titre révélé mot par mot, chaque mot monte de sous une ligne de coupe. */
export function WordReveal({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((w, i) => (
        // L'espace reste hors du masque : dans un inline-block il serait avalé.
        <Fragment key={`${w}-${i}`}>
          <span className={s.wordMask}>
            <motion.span
              className={s.word}
              initial={reduce ? false : { y: '105%', rotate: 4 }}
              animate={{ y: '0%', rotate: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18, delay: delay + i * 0.06 }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

/** Apparition au défilement (montée + fondu), une seule fois. */
export function Reveal({ children, delay = 0, y = 32, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 20, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Bouton « magnétique » : il suit un peu le pointeur, puis revient en ressort. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion()
  const x = useSpring(0, SPRING)
  const y = useSpring(0, SPRING)

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div className={s.magnetic} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  )
}

/**
 * Carte qui s'incline vers le pointeur, avec un halo qui le suit
 * (variables --mx / --my lues par le CSS).
 */
export function TiltCard({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), SPRING)
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), SPRING)

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    e.currentTarget.style.setProperty('--mx', `${nx * 100}%`)
    e.currentTarget.style.setProperty('--my', `${ny * 100}%`)
    if (reduce) return
    px.set(nx)
    py.set(ny)
  }
  function reset() {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  )
}

/** Nombre qui compte jusqu'à sa valeur quand il entre à l'écran. */
export function CountUp({ to, suffix = '', duration = 1.4 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (reduce) {
      el.textContent = `${to}${suffix}`
      return
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = `${Math.round(v)}${suffix}` }
    })
    return () => controls.stop()
  }, [inView, to, suffix, duration, reduce])

  return <span ref={ref} className={s.tnum}>{`0${suffix}`}</span>
}

/** Chrono qui tourne en continu (carte flottante du haut de page). */
export function useTicker(): number {
  const [sec, setSec] = useState(754)
  useEffect(() => {
    const id = window.setInterval(() => setSec((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return sec
}

export function formatClock(total: number): string {
  const m = Math.floor(total / 60) % 60
  const sec = total % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
