import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import s from './landing.module.css'

const HERO_VIDEO_HD = 'https://videos.pexels.com/video-files/4164422/4164422-hd_1920_1080_25fps.mp4'
const HERO_VIDEO_SD = 'https://videos.pexels.com/video-files/4164422/4164422-sd_640_360_25fps.mp4'

export default function LandingPage() {
  const { t } = useTranslation('common')
  const [scrolled, setScrolled] = useState(false)

  const tickerBase = t('landing.ticker', { returnObjects: true }) as string[]
  const features = t('landing.features', { returnObjects: true }) as Array<{
    icon: string
    title: string
    desc: string
    badge?: string
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
      <nav className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
        <Link to="/" className={s.logo}>
          WOD<span>BUD</span>
        </Link>
        <ul className={s.navLinks}>
          <li>
            <a href="#features" className={s.navLink}>
              {t('landing.nav.features')}
            </a>
          </li>
          <li>
            <a href="#how" className={s.navLink}>
              {t('landing.nav.how')}
            </a>
          </li>
          <li>
            <a href="#demo" className={s.navLink}>
              {t('landing.nav.demo')}
            </a>
          </li>
          <li>
            <Link to="/entraineur_dashboard" className={s.navLink}>
              {t('landing.nav.dashboard')}
            </Link>
          </li>
          <li>
            <Link to="/entraineur_dashboard" className={s.btnNav}>
              {t('landing.nav.access_dashboard')}
            </Link>
          </li>
        </ul>
      </nav>

      <section className={s.hero}>
        <video
          className={s.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src={HERO_VIDEO_HD} type="video/mp4" />
          <source src={HERO_VIDEO_SD} type="video/mp4" />
        </video>
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
            <span className={s.badgeFree}>{t('landing.hero.no_card')}</span>
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
          <h3>{t('landing.problem.without_title')}</h3>
          <ul className={s.problemList}>
            {(t('landing.problem.without_items', { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={s.problemDivider} aria-hidden="true" />

        <div className={s.problemCol}>
          <p className={s.problemLabel}>{t('landing.problem.with_label')}</p>
          <h3>{t('landing.problem.with_title')}</h3>
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
              {f.badge && <span className={s.featBadge}>{f.badge}</span>}
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
              <h4>{step.title}</h4>
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

      <footer className={s.footer}>
        <Link to="/" className={s.logo}>
          WOD<span>BUD</span>
        </Link>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <a href="/privacy">{t('landing.footer.privacy')}</a>
          <a href="/contact">{t('landing.footer.contact')}</a>
        </nav>
      </footer>
    </div>
  )
}
