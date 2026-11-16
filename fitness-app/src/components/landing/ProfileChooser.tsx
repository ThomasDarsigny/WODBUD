import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppEntry } from '../../lib/useAppEntry'
import { usePageMeta } from '../../hooks/usePageMeta'
import { LANDING_PROFILES } from '../../lib/landingProfile'
import ChooserPanel from './ChooserPanel'
import s from './landing.module.css'

const LANGS = ['fr', 'en', 'es'] as const

/**
 * Première page (7.2) : « WODBUD, c'est pour qui ? ». Trois colonnes, une par
 * profil, chacune avec une animation de ses fonctionnalités clés et la porte
 * vers sa page (/centres, /membres, /perso).
 */
export default function ProfileChooser() {
  const { t, i18n } = useTranslation('common')
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
            {/* Visiteur : se connecter ; compte déjà ouvert : son espace (constat 13). */}
            {t(appEntry === "/login" ? "landing.nav.login" : "landing.nav.access_dashboard")}
          </Link>
        </div>
      </nav>

      <main className={s.chooserMain}>
        <header className={s.chooserHead}>
          <p className={s.sectionTag}>{t('landing.chooser.tag')}</p>
          <h1 className={s.chooserTitle}>{t('landing.chooser.title')}</h1>
          <p className={s.chooserSub}>{t('landing.chooser.subtitle')}</p>
        </header>

        <div className={s.chooserPanels}>
          {LANDING_PROFILES.map((p, i) => <ChooserPanel key={p} profile={p} index={i} />)}
        </div>
      </main>

      <footer className={s.footer}>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <Link to="/confidentialite">{t('landing.footer.privacy')}</Link>
          <Link to="/contact">{t('landing.footer.contact')}</Link>
        </nav>
      </footer>
    </div>
  )
}
