import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import HeroMedia from './HeroMedia'
import { formatClock, Magnetic, useTicker, WordReveal } from './fx'
import { useAppEntry } from '../../lib/useAppEntry'
import s from './landing.module.css'

/**
 * Haut de page : titre géant révélé mot par mot, halo qui suit le pointeur,
 * carte « séance en cours » dont le chrono tourne vraiment, et un mot
 * fantôme en contour qui glisse au défilement.
 */
export default function HeroWow() {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const sec = useTicker()
  const appEntry = useAppEntry()
  const moves = t('landing.hero.card_moves', { returnObjects: true }) as string[]
  // Un mouvement « fait » toutes les 4 s, en boucle : la carte a l'air vivante.
  const done = Math.floor(sec / 4) % (moves.length + 1)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const ghostX = useTransform(scrollYProgress, [0, 1], ['0%', '-18%'])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  function onMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--hx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--hy', `${e.clientY - r.top}px`)
  }

  return (
    <section ref={ref} className={s.hero} onPointerMove={onMove}>
      <HeroMedia />
      <div className={s.heroOverlay} aria-hidden="true" />
      <div className={s.heroGrid} aria-hidden="true" />
      <div className={s.heroSpot} aria-hidden="true" />

      <motion.div className={s.heroGhost} style={reduce ? undefined : { x: ghostX }} aria-hidden="true">
        WODBUD WODBUD
      </motion.div>

      <motion.div className={s.heroInner} style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}>
        <div className={s.heroContent}>
          <motion.p
            className={s.tag}
            initial={reduce ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('landing.hero.tag')}
          </motion.p>

          <h1 className={s.heroTitle}>
            <WordReveal text={t('landing.hero.title_line1')} delay={0.1} />
            <WordReveal text={t('landing.hero.title_em')} delay={0.35} className={s.heroTitleEm} />
          </h1>

          <motion.p
            className={s.heroSub}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.div
            className={s.ctaRow}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Magnetic>
              <Link to={appEntry} viewTransition className={s.btnPrimary}>
                {t('landing.hero.open_dashboard')}
                <span className={s.btnArrow} aria-hidden="true">→</span>
              </Link>
            </Magnetic>
            <Magnetic>
              <a href="#app" className={s.btnGhost}>
                {t('landing.hero.see_app')}
              </a>
            </Magnetic>
          </motion.div>
        </div>

        <motion.aside
          className={s.heroCard}
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, y: 40, rotate: -6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.6 }}
        >
          <div className={s.heroCardHead}>
            <span className={s.livePill}><i />{t('landing.hero.card_live')}</span>
            <span className={s.heroCardTitle}>{t('landing.hero.card_title')}</span>
          </div>
          <div className={s.heroCardClock}>{formatClock(sec)}</div>
          <ul className={s.heroCardMoves}>
            {moves.map((m, i) => (
              <li key={m} className={i < done ? s.moveDone : undefined}>
                <span className={s.moveCheck}>{i < done ? '✓' : ''}</span>
                {m}
              </li>
            ))}
          </ul>
          <div className={s.heroCardBar}>
            <motion.span animate={{ width: `${(done / moves.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
        </motion.aside>
      </motion.div>

      <div className={s.scrollHint} aria-hidden="true">
        <div className={s.scrollHintLine} />
      </div>
    </section>
  )
}
