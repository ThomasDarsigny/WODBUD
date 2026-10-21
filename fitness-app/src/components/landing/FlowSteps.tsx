import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react'
import s from './landing.module.css'

/**
 * Les 4 étapes, reliées par une ligne qui se remplit au défilement :
 * verticale sur téléphone, horizontale sur ordinateur. Chaque pastille
 * s'allume quand la ligne l'atteint.
 */
export default function FlowSteps() {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const steps = t('landing.flow.steps', { returnObjects: true }) as Array<{ title: string; desc: string }>
  const [reached, setReached] = useState(reduce ? steps.length : 0)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(steps.length, Math.floor(v * steps.length + 0.35))
    if (next !== reached) setReached(next)
  })

  return (
    <section className={s.flow} id="how">
      <p className={s.sectionTag} data-reveal>{t('landing.flow.tag')}</p>
      <h2 className={s.sectionTitle} data-reveal>{t('landing.flow.title')}</h2>

      <div ref={ref} className={s.flowTrack}>
        <div className={s.flowLine} aria-hidden="true">
          <motion.span className={s.flowLineV} style={reduce ? { scaleY: 1 } : { scaleY: fill }} />
          <motion.span className={s.flowLineH} style={reduce ? { scaleX: 1 } : { scaleX: fill }} />
        </div>
        <ol className={s.flowSteps}>
          {steps.map((st, i) => {
            const on = i < reached
            return (
              <li key={st.title} className={`${s.flowStep} ${on ? s.flowStepOn : ''}`}>
                <span className={s.flowDot} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{st.title}</h3>
                  <p>{st.desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
