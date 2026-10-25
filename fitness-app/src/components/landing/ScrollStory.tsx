import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import PhoneFrame from './PhoneFrame'
import s from './landing.module.css'

const IMAGES = ['builder', 'session', 'rank'] as const
/** Défilement accordé à chaque écran, en hauteurs d'écran : de quoi lire le texte. */
const SCREEN_SCROLL = 160

/**
 * Récit au défilement, façon pages produit : le contenu reste collé pendant
 * qu'on défile, et chaque tiers du défilement change l'écran du téléphone et
 * le texte. Chaque écran dispose d'environ 1,6 hauteur d'écran de défilement :
 * à une seule, les textes défilaient trop vite pour être lus.
 */
export default function ScrollStory() {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const screens = t('landing.showcase.screens', { returnObjects: true }) as Array<{ title: string; desc: string; alt: string }>

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(IMAGES.length - 1, Math.max(0, Math.floor(v * IMAGES.length)))
    if (next !== active) setActive(next)
  })

  // Le téléphone pivote doucement et grossit à l'entrée : il « vit » avec le défilement.
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const rotateY = useTransform(smooth, [0, 0.5, 1], [-24, 0, 24])
  const rotateX = useTransform(smooth, [0, 0.5, 1], [6, 2, 6])
  // Le reflet du verre glisse en sens inverse de la rotation.
  const glare = useTransform(smooth, [0, 1], ['85%', '0%'])
  const scale = useTransform(smooth, [0, 0.12, 0.88, 1], [0.88, 1, 1, 0.94])
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section ref={ref} className={s.story} id="app" style={{ height: `${IMAGES.length * SCREEN_SCROLL + 40}svh` }}>
      <div className={s.storySticky}>
        <div className={s.storyCopy}>
          <p className={s.sectionTag}>{t('landing.showcase.tag')}</p>
          <h2 className={s.storyTitle}>{t('landing.showcase.title')}</h2>

          <div className={s.storyStep} aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduce ? undefined : { opacity: 0, y: -16, filter: 'blur(6px)', transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 140, damping: 22 }}
              >
                <span className={s.storyNum}>0{active + 1}</span>
                <h3>{screens[active]?.title}</h3>
                <p>{screens[active]?.desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <ol className={s.storyDots} aria-hidden="true">
            {IMAGES.map((img, i) => (
              <li key={img} className={i === active ? s.storyDotOn : undefined}>
                <span>0{i + 1}</span>
              </li>
            ))}
          </ol>
          <div className={s.storyBar} aria-hidden="true">
            <motion.span style={{ width: bar }} />
          </div>
        </div>

        <div className={s.storyStage}>
          <div className={s.storyGlow} aria-hidden="true" />
          <motion.div className={s.storyPhone} style={reduce ? undefined : { rotateY, rotateX, scale, transformPerspective: 1400, ['--glare' as string]: glare }}>
            <PhoneFrame
              slides={IMAGES.map((img, i) => ({ src: `/landing/${img}.webp`, alt: screens[i]?.alt ?? '' }))}
              active={active}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
