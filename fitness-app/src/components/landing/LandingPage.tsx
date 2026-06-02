import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import s from './landing.module.css'

const HERO_VIDEO_HD = 'https://videos.pexels.com/video-files/4164422/4164422-hd_1920_1080_25fps.mp4'
const HERO_VIDEO_SD = 'https://videos.pexels.com/video-files/4164422/4164422-sd_640_360_25fps.mp4'

const TICKER_ITEMS = [
  "Bibliotheque d'exercices",
  'Programmation de groupe',
  'Methodes AMRAP · EMOM · For Time',
  'Suggestions IA',
  'Export PDF',
  "Videos d'exercices",
  "Regles d'entrainement",
  'CrossFit · Halterophilie · Gymnastics',
]

const FEATURES = [
  {
    icon: '📚',
    title: "Bibliotheque d'exercices",
    desc: "Une large base de donnees d'exercices categorises - halterophilie, gymnastics, cardio, force. Chaque mouvement lie a une video de reference pour la technique.",
  },
  {
    icon: '⚙️',
    title: 'Constructeur de seances',
    desc: "Choisis tes exercices, applique une methode d'entrainement (AMRAP, EMOM, For Time, Rounds...) et configure les regles de la seance en quelques clics.",
  },
  {
    icon: '🤖',
    title: 'Suggestions IA',
    desc: "L'intelligence artificielle analyse ta programmation et propose des variations, des progressions ou des combinaisons d'exercices coherentes avec tes objectifs.",
    badge: "Alimente par l'API Anthropic",
  },
  {
    icon: '🎥',
    title: 'Videos de reference',
    desc: "Associe une video a chaque exercice de ta bibliotheque. Tes athletes voient exactement la technique attendue avant chaque WOD.",
  },
  {
    icon: '📄',
    title: 'Export PDF',
    desc: "Genere une fiche d'entrainement propre et professionnelle en un clic. Ideal pour l'afficher en box ou l'envoyer a ton groupe.",
  },
  {
    icon: '📱',
    title: 'PWA mobile-first',
    desc: "Installe l'app directement sur ton telephone. Acces rapide sur le plancher de la box, meme sans connexion internet.",
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Construis ta bibliotheque',
    desc: "Ajoute tes exercices avec descriptions, groupes musculaires et videos de reference. Reutilisable a l'infini.",
  },
  {
    num: '02',
    title: 'Cree ton entrainement',
    desc: "Selectionne tes exercices, choisis une methode (AMRAP, EMOM...) et configure les regles de la seance.",
  },
  {
    num: '03',
    title: "Affine avec l'IA",
    desc: "Demande des suggestions a l'IA pour varier, progresser ou equilibrer la charge de ton programme.",
  },
  {
    num: '04',
    title: 'Exporte et partage',
    desc: 'Genere le PDF et partage la seance avec ton groupe. Affiche-le en box ou envoie-le directement.',
  },
]

const DEMO_PERKS = [
  'Session personnalisee pour ta box',
  'Questions repondues en direct',
  'Cas concrets de programmation',
  'Plan de demarrage rapide',
  'Apercu de la roadmap produit',
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS]

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
          FORGE<span>X</span>
        </Link>
        <ul className={s.navLinks}>
          <li>
            <a href="#features" className={s.navLink}>
              Fonctionnalites
            </a>
          </li>
          <li>
            <a href="#how" className={s.navLink}>
              Comment ca marche
            </a>
          </li>
          <li>
            <a href="#demo" className={s.navLink}>
              Demo
            </a>
          </li>
          <li>
            <Link to="/entraineur_dashboard" className={s.navLink}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/entraineur_dashboard" className={s.btnNav}>
              Acceder au dashboard
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
          <p className={s.tag}>Pour entraineurs fitness</p>

          <h1 className={s.heroTitle}>
            Lance ta programmation
            <br />
            <em>gratuitement pendant 30 jours.</em>
          </h1>

          <p className={s.heroSub}>
            Construis tes entrainements de groupe en quelques minutes. Base d'exercices complete,
            methodes de programmation, videos et suggestions IA — tout au meme endroit, sans carte
            de credit.
          </p>

          <div className={s.ctaRow}>
            <Link to="/entraineur_dashboard" className={s.btnPrimary}>
              Ouvrir le dashboard coach
            </Link>
            <a href="#demo" className={s.btnGhost}>
              Voir une demo
            </a>
            <span className={s.badgeFree}>Sans carte de credit</span>
          </div>

          <div className={s.heroStats}>
            <div className={s.statItem}>
              <strong>500+</strong>
              <span>Athletes actifs</span>
            </div>
            <div className={s.statDivider} aria-hidden="true" />
            <div className={s.statItem}>
              <strong>200+</strong>
              <span>WODs crees</span>
            </div>
            <div className={s.statDivider} aria-hidden="true" />
            <div className={s.statItem}>
              <strong>50+</strong>
              <span>Coachs certifies</span>
            </div>
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
          <p className={s.problemLabel}>Le probleme actuel</p>
          <h3>Sans ForgeX</h3>
          <ul className={s.problemList}>
            <li>Feuilles Excel dispersees et difficiles a maintenir</li>
            <li>Pas de reference visuelle pour les exercices techniques</li>
            <li>Programmation chronophage et repetitive</li>
            <li>Aucune coherence dans les methodes d'entrainement</li>
            <li>Export et partage du programme = galere</li>
            <li>Reinventer la roue a chaque cycle</li>
          </ul>
        </div>

        <div className={s.problemDivider} aria-hidden="true" />

        <div className={s.problemCol}>
          <p className={s.problemLabel}>Avec la plateforme</p>
          <h3>Avec ForgeX</h3>
          <ul className={s.solutionList}>
            <li>Tout centralise dans une seule interface</li>
            <li>Videos liees directement a chaque exercice</li>
            <li>L'IA suggere des entrainements adaptes</li>
            <li>Methodes structurees (AMRAP, EMOM, Rounds...)</li>
            <li>PDF professionnel genere en un clic</li>
            <li>Bibliotheque reutilisable d'une seance a l'autre</li>
          </ul>
        </div>
      </div>

      <section className={s.section} id="features">
        <p className={s.sectionTag} data-reveal>
          Fonctionnalites
        </p>
        <h2 className={s.sectionTitle} data-reveal>
          Tout ce qu'un coach
          <br />
          CrossFit a besoin
        </h2>
        <div className={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={s.feat}
              data-reveal
              style={{ transitionDelay: `${i * 75}ms` }}
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
        <p className={s.sectionTag} data-reveal>
          Flux de travail
        </p>
        <h2 className={s.sectionTitle} data-reveal>
          Comment ca marche
        </h2>
        <div className={s.steps}>
          {STEPS.map((step, i) => (
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
              {i < STEPS.length - 1 && (
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
            <p className={s.betaTag}>Demo ForgeX</p>
            <h2>
              Reserve une demo
              <br />
              de la plateforme
            </h2>
            <p>
              Decouvre comment ForgeX accelere la creation de WODs, structure tes cycles et facilite
              le partage avec tes athletes. On te montre des cas concrets adaptes a ton contexte.
            </p>
            <div className={s.betaButtons}>
              <a href="mailto:demo@forgex.app" className={s.btnPrimary}>
                Reserver une demo
              </a>
              <a href="#features" className={s.btnGhost}>
                Voir les fonctionnalites
              </a>
            </div>
          </div>

          <div className={s.betaRight} aria-label="Avantages demo">
            {DEMO_PERKS.map((perk) => (
              <div key={perk} className={s.betaPoint}>
                <span aria-hidden="true">✓</span>
                {perk}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <Link to="/" className={s.logo}>
          FORGE<span>X</span>
        </Link>
        <p className={s.footerCopy}>© 2026 ForgeX — Plateforme en developpement actif</p>
        <nav className={s.footerLinks} aria-label="Liens de bas de page">
          <a href="/privacy">Confidentialite</a>
          <a href="/contact">Contact</a>
        </nav>
      </footer>
    </div>
  )
}
