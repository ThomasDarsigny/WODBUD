import { Link } from 'react-router-dom'
import s from './landing.module.css'

const TICKER_ITEMS = [
  "Bibliotheque d'exercices",
  'Programmation de groupe',
  'Methodes AMRAP · EMOM · For Time',
  'Suggestions IA',
  'Export PDF',
  "Videos d'exercices",
  "Regles d'entrainement",
  'CrossFit · Halterophilie · Gymnastics'
]

const FEATURES = [
  {
    icon: '📚',
    title: "Bibliotheque d'exercices",
    desc: "Une large base de donnees d'exercices categorises - halterophilie, gymnastics, cardio, force. Chaque mouvement lie a une video de reference pour la technique."
  },
  {
    icon: '⚙️',
    title: 'Constructeur de seances',
    desc: "Choisis tes exercices, applique une methode d'entrainement (AMRAP, EMOM, For Time, Rounds...) et configure les regles de la seance en quelques clics."
  },
  {
    icon: '🤖',
    title: 'Suggestions IA',
    desc: "L'intelligence artificielle analyse ta programmation et propose des variations, des progressions ou des combinaisons d'exercices coherentes avec tes objectifs.",
    badge: "Alimente par l'API Anthropic"
  },
  {
    icon: '🎥',
    title: 'Videos de reference',
    desc: "Associe une video a chaque exercice de ta bibliotheque. Tes athletes voient exactement la technique attendue avant chaque WOD."
  },
  {
    icon: '📄',
    title: 'Export PDF',
    desc: "Genere une fiche d'entrainement propre et professionnelle en un clic. Ideal pour l'afficher en box ou l'envoyer a ton groupe."
  },
  {
    icon: '📱',
    title: 'PWA mobile-first',
    desc: "Installe l'app directement sur ton telephone. Acces rapide sur le plancher de la box, meme sans connexion internet."
  }
]

const STEPS = [
  {
    num: '01',
    title: 'Construis ta bibliotheque',
    desc: "Ajoute tes exercices avec descriptions, groupes musculaires et videos de reference. Reutilisable a l'infini."
  },
  {
    num: '02',
    title: 'Cree ton entrainement',
    desc: "Selectionne tes exercices, choisis une methode (AMRAP, EMOM...) et configure les regles de la seance."
  },
  {
    num: '03',
    title: "Affine avec l'IA",
    desc: "Demande des suggestions a l'IA pour varier, progresser ou equilibrer la charge de ton programme."
  },
  {
    num: '04',
    title: 'Exporte et partage',
    desc: 'Genere le PDF et partage la seance avec ton groupe. Affiche-le en box ou envoie-le directement.'
  }
]

const DEMO_PERKS = [
  'Session personnalisee pour ta box',
  'Questions repondues en direct',
  'Cas concrets de programmation',
  'Plan de demarrage rapide',
  'Apercu de la roadmap produit'
]

export default function LandingPage() {
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div className={s.root}>
      <nav className={s.nav}>
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
            <Link to="/signup" className={s.btnNav}>Essai 1 mois gratuit</Link>
          </li>
        </ul>
      </nav>

      <section className={s.hero}>
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={s.heroGlow} aria-hidden="true" />

        <p className={s.tag}>Pour entraineurs fitness</p>

        <h1 className={s.heroTitle}>
          Lance ta programmation
          <br />
          <em>gratuitement pendant 30 jours.</em>
        </h1>

        <p className={s.heroSub}>
          Construis tes entrainements de groupe en quelques minutes. Base d'exercices complete,
          methodes de programmation, videos et suggestions IA - tout au meme endroit, sans carte
          de credit.
        </p>

        <div className={s.ctaRow}>
          <Link to="/signup" className={s.btnPrimary}>
            Essayer gratuitement 1 mois
          </Link>
          <a href="#demo" className={s.btnGhost}>
            Voir une demo
          </a>
          <span className={s.badgeFree}>Sans carte de credit</span>
        </div>

        <div className={s.ticker} aria-hidden="true">
          <div className={s.tickerInner}>
            {tickerItems.map((item, i) => (
              <span key={i} className={s.tickerItem}>
                <b>◆</b> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className={s.problem}>
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
        <p className={s.sectionTag}>Fonctionnalites</p>
        <h2 className={s.sectionTitle}>
          Tout ce qu'un coach
          <br />
          CrossFit a besoin
        </h2>
        <div className={s.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={s.feat}>
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
        <p className={s.sectionTag}>Flux de travail</p>
        <h2 className={s.sectionTitle}>Comment ca marche</h2>
        <div className={s.steps}>
          {STEPS.map((step, i) => (
            <div key={step.num} className={s.step}>
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
        <div className={s.betaCard}>
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
              <a href="mailto:demo@forgex.app" className={s.btnPrimary}>Book a demo</a>
              <a href="#features" className={s.btnGhost}>Voir les fonctionnalites</a>
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
        <p className={s.footerCopy}>© 2026 ForgeX - Plateforme en developpement actif</p>
        <nav className={s.footerLinks} aria-label="Liens de bas de page">
          <a href="/privacy">Confidentialite</a>
          <a href="/contact">Contact</a>
        </nav>
      </footer>
    </div>
  )
}
