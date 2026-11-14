import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useEffect, useState } from 'react'
import HeroWow from './HeroWow'
import ScrollStory from './ScrollStory'
import { CountUp } from './fx'
import ProblemPairs from './ProblemPairs'
import FeatureBento, { type BentoTile } from './FeatureBento'
import FlowSteps from './FlowSteps'
import ProfileHighlights from './ProfileHighlights'
import { usePageMeta } from '../../hooks/usePageMeta'
import { PROFILE_PATHS, LANDING_PROFILES, type LandingProfile } from '../../lib/landingProfile'
import { useAppEntry } from '../../lib/useAppEntry'
import { APP_STORE_URL, PLAY_STORE_URL, STORES_LIVE } from '../../lib/storeLinks'
import s from './landing.module.css'

// Le mannequin (tracés SVG du corps) n'est chargé qu'à l'arrivée sur la page,
// pas dans le premier rendu du haut de page.
const MannequinDemo = lazy(() => import('./MannequinDemo'))

const LANGS = ['fr', 'en', 'es'] as const

type Section = 'story' | 'problems' | 'features' | 'try' | 'flow'

/**
 * Ce que montre chaque page : seulement les fonctionnalités de son profil.
 * Un centre ne voit ni le chrono ni les rangs des membres ; un membre ne voit
 * pas les outils du coach (créateur, assistant IA, votes à lancer) ; un perso
 * voit ses outils à lui, sans ceux d'une équipe. Le mannequin (« Essaie-le »)
 * est partout : coach et perso bâtissent leurs WODs, le membre le voit pendant
 * sa séance.
 */
const PAGE: Record<LandingProfile, { sections: Section[]; story: number[]; tiles: BentoTile[] }> = {
  center: { sections: ['problems', 'features', 'try', 'flow'], story: [], tiles: ['mann', 'lib', 'meth', 'vote', 'ai'] },
  member: { sections: ['story', 'try'], story: [1, 2], tiles: [] },
  perso: { sections: ['story', 'features', 'try'], story: [0, 1, 2], tiles: ['mann', 'lib', 'meth', 'ai'] }
}

/** Entrées du menu, dans l'ordre de la page ; seules celles des sections présentes s'affichent. */
const NAV: Array<{ href: string; label: string; section?: Section }> = [
  { href: '#app', label: 'landing.nav.demo', section: 'story' },
  { href: '#features', label: 'landing.nav.features', section: 'features' },
  { href: '#how', label: 'landing.nav.how', section: 'flow' },
  { href: '#try', label: 'landing.nav.try', section: 'try' },
  { href: '#download', label: 'landing.nav.download' }
]

/** Une page par profil (7.3–7.5) : /centres, /membres, /perso. */
export default function LandingPage({ profile }: { profile: LandingProfile }) {
  const { t, i18n } = useTranslation('common')
  usePageMeta(t(`landing.profiles.${profile}.meta_title`), t(`landing.profiles.${profile}.meta_description`))
  const [scrolled, setScrolled] = useState(false)
  const appEntry = useAppEntry()
  // Menu replié sur téléphone (☰) ; toujours déplié à partir de 960px.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const page = PAGE[profile]
  const show = (section: Section) => page.sections.includes(section)
  // Bandeau et chiffres propres au profil quand la page en a (sinon ceux de la landing).
  const own = (key: string) => (i18n.exists(`landing.profiles.${profile}.${key}`) ? `landing.profiles.${profile}.${key}` : `landing.${key}`)
  const tickerBase = t(own('ticker'), { returnObjects: true }) as string[]
  const stats = t(own('stats'), { returnObjects: true }) as Array<{ value: number; suffix: string; label: string }>
  const storyTitle = i18n.exists(`landing.profiles.${profile}.showcase_title`) ? t(`landing.profiles.${profile}.showcase_title`) : t('landing.showcase.title')
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(0, 2)
  const tickerItems = [...tickerBase, ...tickerBase]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className={s.root}>
      <nav className={`${s.nav} ${scrolled || menuOpen ? s.navScrolled : ''}`}>
        <Link to="/" className={`${s.logo} ${s.logoVT}`} onClick={closeMenu}>
          WOD<span>BUD</span>
        </Link>
        <ul id="landing-menu" className={`${s.navLinks} ${menuOpen ? s.navLinksOpen : ''}`}>
          {LANDING_PROFILES.filter((p) => p !== profile).map((p) => (
            <li key={p} className={s.navProfile}>
              <Link to={PROFILE_PATHS[p]} viewTransition className={s.navLink} onClick={closeMenu}>
                {t(`landing.chooser.${p}_title`)}
              </Link>
            </li>
          ))}
          {NAV.filter((n) => !n.section || show(n.section)).map((n) => (
            <li key={n.href}>
              <a href={n.href} className={s.navLink} onClick={closeMenu}>
                {t(n.label)}
              </a>
            </li>
          ))}
          <li className={s.langItem}>
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
          </li>
        </ul>
        <div className={s.navRight}>
          <Link to={appEntry} viewTransition className={s.btnNav}>
            <span className={s.labelShort}>{t('landing.nav.login')}</span>
            <span className={s.labelLong}>{t('landing.nav.access_dashboard')}</span>
          </Link>
          <button
            type="button"
            className={s.menuBtn}
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            aria-label={menuOpen ? t('landing.nav.menu_close') : t('landing.nav.menu_open')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <HeroWow profile={profile} seeHref={show('story') ? '#app' : '#features'} />

      <div className={s.ticker} aria-hidden="true">
        <div className={s.tickerInner}>
          {tickerItems.map((item, i) => (
            <span key={i} className={`${s.tickerItem} ${i % 2 ? s.tickerOutline : ''}`}>
              {item}
              <b aria-hidden="true">✦</b>
            </span>
          ))}
        </div>
      </div>

      <section className={s.stats} aria-label={t('landing.stats_label')}>
        {stats.map((st) => (
          <div key={st.label} className={s.stat} data-reveal>
            <strong>
              <CountUp to={st.value} suffix={st.suffix} />
            </strong>
            <span>{st.label}</span>
          </div>
        ))}
      </section>

      <ProfileHighlights profile={profile} />

      {show('story') && <ScrollStory screens={page.story} title={storyTitle} />}

      {show('problems') && <ProblemPairs />}

      {show('features') && (
        <section className={s.section} id="features">
          <p className={s.sectionTag} data-reveal>{t('landing.features_tag')}</p>
          <h2 className={s.sectionTitle} data-reveal>
            {t(own('features_title_line1'))}
            <br />
            {t(own('features_title_line2'))}
          </h2>
          <FeatureBento
            tiles={page.tiles}
            layout={profile === 'center' ? 'center' : 'perso'}
            chat={profile === 'perso' ? (t('landing.profiles.perso.ai_chat', { returnObjects: true }) as Array<{ from: 'me' | 'ai'; text: string }>) : undefined}
          />
        </section>
      )}

      {show('try') && (
      <section className={s.try} id="try">
        <p className={s.sectionTag} data-reveal>{t('landing.try.tag')}</p>
        <h2 className={s.sectionTitle} data-reveal>{t('landing.try.title')}</h2>
        <p className={s.sectionLead} data-reveal>{t('landing.try.subtitle')}</p>
        <Suspense fallback={<div className={s.tryFallback} aria-hidden="true" />}>
          <MannequinDemo />
        </Suspense>
      </section>
      )}

      {show('flow') && <FlowSteps />}

      <section className={s.download} id="download">
        <p className={s.sectionTag} data-reveal>{t('landing.download.tag')}</p>
        <h2 className={s.sectionTitle} data-reveal>{t('landing.download.title')}</h2>
        <p className={s.downloadText} data-reveal>{t('landing.download.subtitle')}</p>
        <div className={s.storeRow} data-reveal>
          <StoreButton
            href={APP_STORE_URL}
            kicker={STORES_LIVE ? t('landing.download.available_on') : t('landing.download.soon_on')}
            store="App Store"
            logo="apple"
            soon={!STORES_LIVE}
            soonLabel={t('landing.download.soon')}
          />
          <StoreButton
            href={PLAY_STORE_URL}
            kicker={STORES_LIVE ? t('landing.download.available_on') : t('landing.download.soon_on')}
            store="Google Play"
            logo="googleplay"
            soon={!STORES_LIVE}
            soonLabel={t('landing.download.soon')}
          />
        </div>
        {!STORES_LIVE && (
          <p className={s.downloadHint} data-reveal>
            {t('landing.download.meanwhile')}{' '}
            <Link to="/signup" viewTransition>{t('landing.download.meanwhile_link')}</Link>
          </p>
        )}
      </section>

      <footer className={s.footer}>
        <Link to="/" className={s.logo}>
          WOD<span>BUD</span>
        </Link>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <Link to="/confidentialite">{t('landing.footer.privacy')}</Link>
          <Link to="/contact">{t('landing.footer.contact')}</Link>
        </nav>
      </footer>
    </div>
  )
}

/** Tracés des logos (Simple Icons, CC0), affichés en monochrome comme sur les badges officiels. */
const STORE_LOGOS = {
  apple:
    'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  googleplay:
    'M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z'
} as const

function StoreButton({ href, kicker, store, logo, soon, soonLabel }: {
  href: string
  kicker: string
  store: string
  logo: keyof typeof STORE_LOGOS
  soon: boolean
  soonLabel: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={s.storeBtn}>
      <svg className={s.storeIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d={STORE_LOGOS[logo]} fill="currentColor" />
      </svg>
      <span className={s.storeText}>
        <small>{kicker}</small>
        <strong>{store}</strong>
      </span>
      {soon && <span className={s.storeSoon}>{soonLabel}</span>}
    </a>
  )
}
