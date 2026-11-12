import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import NavIcon, { type NavIconName } from '../navigation/NavIcon'
import type { LandingProfile } from '../../lib/landingProfile'
import s from './landing.module.css'

type Item = { icon: NavIconName; title: string; text: string }

const ANCHOR: Record<LandingProfile, string> = { center: 'centres', member: 'membres', perso: 'perso' }

/**
 * Section « ce que WODBUD fait pour toi » de chaque page profil (7.3–7.5) :
 * une carte par fonction réellement livrée. Pas de promesse en l'air.
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
            className={s.centerCard}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={s.centerIcon} aria-hidden="true"><NavIcon name={it.icon} size={22} /></span>
            <strong>{it.title}</strong>
            <p>{it.text}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
