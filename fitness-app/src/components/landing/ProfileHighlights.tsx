import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'
import { TiltCard } from './fx'
import type { LandingProfile } from '../../lib/landingProfile'
import s from './landing.module.css'

type Item = { icon: NavIconName; title: string; text: string }

const ANCHOR: Record<LandingProfile, string> = { center: 'centres', member: 'membres', perso: 'perso' }
const EASE = [0.16, 1, 0.3, 1] as const

// Entrée en cascade : la carte sort d'un léger flou, puis son icône « claque »
// avec un ressort et lance une onde. Rien de tout ça si l'appareil demande
// moins d'animations.
const card: Variants = {
  off: { opacity: 0, y: 36, scale: 0.96, filter: 'blur(8px)' },
  on: (i: number) => ({
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.7, delay: (i % 3) * 0.09, ease: EASE }
  })
}
const icon: Variants = {
  off: { scale: 0.4, rotate: -20, opacity: 0 },
  on: (i: number) => ({
    scale: 1, rotate: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 420, damping: 18, delay: 0.25 + (i % 3) * 0.09 }
  })
}
const ring: Variants = {
  off: { scale: 0.6, opacity: 0 },
  on: (i: number) => ({
    scale: [0.6, 1.9], opacity: [0.55, 0],
    transition: { duration: 0.9, ease: 'easeOut', delay: 0.35 + (i % 3) * 0.09 }
  })
}

/**
 * Section « ce que WODBUD fait pour toi » de chaque page profil (7.3–7.5),
 * animée (7.7) : entrée en cascade, halo qui suit la souris, légère
 * inclinaison au survol, grand numéro en contour. Une carte par fonction
 * réellement livrée — pas de promesse en l'air.
 */
export default function ProfileHighlights({ profile }: { profile: LandingProfile }) {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()
  const items = t(`landing.highlights.${profile}.items`, { returnObjects: true }) as Item[]

  return (
    <section className={s.section} id={ANCHOR[profile]}>
      <p className={s.sectionTag} data-reveal>{t(`landing.highlights.${profile}.tag`)}</p>
      <h2 className={s.sectionTitle} data-reveal>{t(`landing.highlights.${profile}.title`)}</h2>
      <p className={s.sectionLead} data-reveal>{t(`landing.highlights.${profile}.lead`)}</p>
      <ul className={s.centerGrid}>
        {items.map((it, i) => (
          <motion.li
            key={it.title}
            className={s.centerItem}
            custom={i}
            variants={reduce ? undefined : card}
            initial={reduce ? false : 'off'}
            whileInView="on"
            viewport={{ once: true, amount: 0.3 }}
          >
            <TiltCard className={s.centerCard} intensity={0.25}>
              <span className={s.centerNum} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className={s.centerIconWrap} aria-hidden="true">
                {!reduce && <motion.span className={s.centerRing} custom={i} variants={ring} />}
                <motion.span className={s.centerIcon} custom={i} variants={reduce ? undefined : icon}>
                  <NavIcon name={it.icon} size={22} />
                </motion.span>
              </span>
              <strong>{it.title}</strong>
              <p>{it.text}</p>
            </TiltCard>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
