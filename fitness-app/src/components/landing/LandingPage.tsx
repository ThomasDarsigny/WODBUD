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
            soon={!STORES_LIVE}
            soonLabel={t('landing.download.soon')}
          />
          <StoreButton
            href={PLAY_STORE_URL}
            kicker={STORES_LIVE ? t('landing.download.available_on') : t('landing.download.soon_on')}
            store="Google Play"
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

function StoreButton({ href, kicker, store, soon, soonLabel }: {
  href: string
  kicker: string
  store: string
  soon: boolean
  soonLabel: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={s.storeBtn}>
      <svg className={s.storeIcon} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className={s.storeText}>
        <small>{kicker}</small>
        <strong>{store}</strong>
      </span>
      {soon && <span className={s.storeSoon}>{soonLabel}</span>}
    </a>
  )
}
