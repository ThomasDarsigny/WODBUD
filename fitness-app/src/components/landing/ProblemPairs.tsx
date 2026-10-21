import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import s from './landing.module.css'

/**
 * « Avant / avec » en paires : l'irritant s'efface un peu quand il arrive à
 * l'écran, puis sa solution glisse à côté. Une ligne = une idée.
 * Pas de texte barré ni de capitales sur des phrases : ça se lit d'abord.
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
            <motion.p
              className={s.pairPain}
              variants={{ off: { opacity: 1 }, on: { opacity: 0.85 } }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <span className={s.srOnly}>{t('landing.problem.pain_label')} : </span>
              <span className={s.pairX} aria-hidden="true">✕</span>
              {p.pain}
            </motion.p>
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
