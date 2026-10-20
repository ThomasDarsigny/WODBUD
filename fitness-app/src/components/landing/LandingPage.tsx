import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import HeroMedia from './HeroMedia'
import { APP_STORE_URL, PLAY_STORE_URL, STORES_LIVE } from '../../lib/storeLinks'
import s from './landing.module.css'

export default function LandingPage() {
  const { t } = useTranslation('common')
  const [scrolled, setScrolled] = useState(false)
  // Menu replié sur téléphone (☰) ; toujours déplié à partir de 960px.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const tickerBase = t('landing.ticker', { returnObjects: true }) as string[]
  const features = t('landing.features', { returnObjects: true }) as Array<{
    icon: string
    title: string
    desc: string
  }>
  const steps = t('landing.steps', { returnObjects: true }) as Array<{
    num: string
    title: string
    desc: string
  }>
  const demoPerks = t('landing.demo.perks', { returnObjects: true }) as string[]
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
        <Link to="/" className={s.logo} onClick={closeMenu}>
          WOD<span>BUD</span>
        </Link>
        <ul id="landing-menu" className={`${s.navLinks} ${menuOpen ? s.navLinksOpen : ''}`}>
          <li>
            <a href="#features" className={s.navLink} onClick={closeMenu}>
              {t('landing.nav.features')}
            </a>
          </li>
          <li>
            <a href="#how" className={s.navLink} onClick={closeMenu}>
              {t('landing.nav.how')}
            </a>
          </li>
          <li>
            <a href="#demo" className={s.navLink} onClick={closeMenu}>
              {t('landing.nav.demo')}
            </a>
          </li>
          <li>
            <a href="#download" className={s.navLink} onClick={closeMenu}>
              {t('landing.nav.download')}
            </a>
          </li>
        </ul>
        <div className={s.navRight}>
          <Link to="/entraineur_dashboard" className={s.btnNav}>
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

      <section className={s.hero}>
        <HeroMedia />
        <div className={s.heroOverlay} aria-hidden="true" />
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={s.heroGlow} aria-hidden="true" />

        <div className={s.heroContent}>
          <p className={s.tag}>{t('landing.hero.tag')}</p>

          <h1 className={s.heroTitle}>
            {t('landing.hero.title_line1')}
            <br />
            <em>{t('landing.hero.title_em')}</em>
          </h1>

          <p className={s.heroSub}>{t('landing.hero.subtitle')}</p>

          <div className={s.ctaRow}>
            <Link to="/entraineur_dashboard" className={s.btnPrimary}>
              {t('landing.hero.open_dashboard')}
            </Link>
            <a href="#demo" className={s.btnGhost}>
              {t('landing.hero.watch_demo')}
            </a>
          </div>
        </div>

        <div className={s.scrollHint} aria-hidden="true">
          <div className={s.scrollHintLine} />
        </div>
      </section>

      <div className={s.ticker} aria-hidden="true">
        <div className={s.tickerInner}>
          {tickerItems.map((item, i) => (
            <span key={i} className={s.tickerItem}>
              <b>◆</b> {item}
            </span>
          ))}
        </div>
      </div>

      <div className={s.problem} data-reveal>
        <div className={s.problemCol}>
          <p className={s.problemLabel}>{t('landing.problem.without_label')}</p>
          <h2>{t('landing.problem.without_title')}</h2>
          <ul className={s.problemList}>
            {(t('landing.problem.without_items', { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={s.problemDivider} aria-hidden="true" />

        <div className={s.problemCol}>
          <p className={s.problemLabel}>{t('landing.problem.with_label')}</p>
          <h2>{t('landing.problem.with_title')}</h2>
          <ul className={s.solutionList}>
            {(t('landing.problem.with_items', { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <section className={s.section} id="features">
        <p className={s.sectionTag} data-reveal>{t('landing.features_tag')}</p>
        <h2 className={s.sectionTitle} data-reveal>
          {t('landing.features_title_line1')}
          <br />
          {t('landing.features_title_line2')}
        </h2>
        <div className={s.featuresGrid}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className={s.feat}
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className={s.featIcon} aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={s.how} id="how">
        <p className={s.sectionTag} data-reveal>{t('landing.workflow_tag')}</p>
        <h2 className={s.sectionTitle} data-reveal>{t('landing.workflow_title')}</h2>
        <div className={s.steps}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={s.step}
              data-reveal
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={s.stepNum} aria-hidden="true">
                {step.num}
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {i < steps.length - 1 && (
                <span className={s.stepArrow} aria-hidden="true">
                  ›
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={s.beta} id="demo">
        <div className={s.betaCard} data-reveal>
          <div>
            <p className={s.betaTag}>{t('landing.demo.tag')}</p>
            <h2>
              {t('landing.demo.title_line1')}
              <br />
              {t('landing.demo.title_line2')}
            </h2>
            <p>{t('landing.demo.subtitle')}</p>
            <div className={s.betaButtons}>
              <a href="mailto:demo@wodbud.com" className={s.btnPrimary}>
                {t('landing.demo.book')}
              </a>
              <a href="#features" className={s.btnGhost}>
                {t('landing.demo.view_features')}
              </a>
            </div>
          </div>

          <div className={s.betaRight} aria-label={t('landing.demo.perks_label')}>
            {demoPerks.map((perk) => (
              <div key={perk} className={s.betaPoint}>
                <span aria-hidden="true">-</span>
                {perk}
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <Link to="/signup">{t('landing.download.meanwhile_link')}</Link>
          </p>
        )}
      </section>

      <footer className={s.footer}>
        <Link to="/" className={s.logo}>
          WOD<span>BUD</span>
        </Link>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <a href="/confidentialite">{t('landing.footer.privacy')}</a>
          <a href="/contact">{t('landing.footer.contact')}</a>
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
