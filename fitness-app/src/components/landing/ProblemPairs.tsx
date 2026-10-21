import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import s from './landing.module.css'

/**
 * « Avant / avec » en paires : chaque irritant est rayé quand il arrive à
 * l'écran, puis sa solution apparaît juste à côté. Une ligne = une idée.
 */
export default function ProblemPairs() {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()
  const pairs = t('landing.problem.pairs', { returnObjects: true }) as Array<{ pain: string; fix: string }>

  return (
    <section className={s.pairsSection} id="problem">
      <p className={s.sectionTag} data-reveal>{t('landing.problem.tag')}</p>
      <h2 className={s.sectionTitle} data-reveal>{t('landing.problem.title')}</h2>

      <div className={s.pairsHead} aria-hidden="true">
        <span>{t('landing.problem.pain_label')}</span>
        <span>{t('landing.problem.fix_label')}</span>
      </div>

      <ol className={s.pairs}>
        {pairs.map((p, i) => (
          <motion.li
            key={p.pain}
            className={s.pair}
            initial={reduce ? false : 'off'}
            whileInView="on"
            viewport={{ once: true, margin: '0px 0px -15% 0px' }}
            variants={{ off: {}, on: {} }}
          >
            <span className={s.pairNum} aria-hidden="true">0{i + 1}</span>
            <p className={s.pairPain}>
              <span className={s.srOnly}>{t('landing.problem.pain_label')} : </span>
              <span className={s.pairPainText}>
                {p.pain}
                <motion.span
                  className={s.pairStrike}
                  aria-hidden="true"
                  variants={{ off: { scaleX: 0 }, on: { scaleX: 1 } }}
                  transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1], delay: 0.1 }}
                />
              </span>
            </p>
            <motion.span
              className={s.pairArrow}
              aria-hidden="true"
              variants={{ off: { opacity: 0, x: -8 }, on: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.3, delay: 0.45 }}
            >
              →
            </motion.span>
            <motion.p
              className={s.pairFix}
              variants={{ off: { opacity: 0, x: 20 }, on: { opacity: 1, x: 0 } }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.5 }}
            >
              <span className={s.srOnly}>{t('landing.problem.fix_label')} : </span>
              <span className={s.pairCheck} aria-hidden="true">✓</span>
              {p.fix}
            </motion.p>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
