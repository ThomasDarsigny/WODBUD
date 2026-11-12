import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { useAppEntry } from '../../lib/useAppEntry'
import { usePageMeta } from '../../hooks/usePageMeta'
import { LANDING_PROFILES, PROFILE_PATHS, rememberProfileHint } from '../../lib/landingProfile'
import s from './landing.module.css'

const LANGS = ['fr', 'en', 'es'] as const
// Mêmes illustrations que l'écran Bienvenue, pour qu'on s'y retrouve après l'inscription.
const ART = { center: 'sifflet', member: 'membre', perso: 'premiere-serie' } as const

/**
 * Première page (7.2) : « WODBUD, c'est pour qui ? ». Trois portes vers
 * /centres, /membres et /perso, chacune avec son message.
 */
export default function ProfileChooser() {
  const { t, i18n } = useTranslation('common')
  const reduce = useReducedMotion()
  const appEntry = useAppEntry()
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(0, 2)
  usePageMeta(t('landing.chooser.meta_title'), t('landing.chooser.meta_description'))

  return (
    <div className={`${s.root} ${s.chooser}`}>
      <nav className={`${s.nav} ${s.navScrolled}`}>
        <Link to="/" className={s.logo}>WOD<span>BUD</span></Link>
        <div className={s.navRight}>
          <div className={s.langSwitch} role="group" aria-label={t('landing.lang_label')}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={currentLang === l}
                className={`${s.langBtn} ${currentLang === l ? s.langBtnOn : ''}`}
                onClick={() => { void i18n.changeLanguage(l) }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to={appEntry} viewTransition className={s.btnNav}>
            <span className={s.labelShort}>{t('landing.nav.login')}</span>
            <span className={s.labelLong}>{t('landing.nav.access_dashboard')}</span>
          </Link>
        </div>
      </nav>

      <main className={s.chooserMain}>
        <p className={s.sectionTag}>{t('landing.chooser.tag')}</p>
        <h1 className={s.chooserTitle}>{t('landing.chooser.title')}</h1>
        <p className={s.chooserSub}>{t('landing.chooser.subtitle')}</p>

        <ul className={s.chooserCards}>
          {LANDING_PROFILES.map((p, i) => (
            <motion.li
              key={p}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={PROFILE_PATHS[p]}
                viewTransition
                className={`${s.chooserCard} ${p === 'center' ? s.chooserCardMain : ''}`}
                onClick={() => rememberProfileHint(p)}
              >
                <img src={`/badges/${ART[p]}.svg`} alt="" width={64} height={64} />
                <span className={s.chooserCardText}>
                  <strong>{t(`landing.chooser.${p}_title`)}</strong>
                  <small>{t(`landing.chooser.${p}_desc`)}</small>
                </span>
                <span className={s.btnArrow} aria-hidden="true">→</span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </main>

      <footer className={s.footer}>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <a href="/confidentialite">{t('landing.footer.privacy')}</a>
          <a href="/contact">{t('landing.footer.contact')}</a>
        </nav>
      </footer>
    </div>
  )
}
