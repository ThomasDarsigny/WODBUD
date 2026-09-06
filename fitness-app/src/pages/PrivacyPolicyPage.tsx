import { Link } from 'react-router-dom'

/**
 * Politique de confidentialité — Loi 25 (Québec) et LPRPDE (Canada).
 *
 * Le français est la version qui fait foi : la Loi 96 l'exige pour une
 * clientèle québécoise. Le texte est volontairement gardé hors des
 * fichiers i18n — c'est un document juridique, pas de l'interface.
 *
 * Les blocs [À COMPLÉTER] sont les seuls éléments que le code ne peut pas
 * deviner. Ils doivent être remplis AVANT la mise en ligne : publier une
 * politique incomplète est pire que ne rien publier.
 */

const DERNIERE_MAJ = '3 septembre 2026'

type Bloc = { t: string; p: (string | string[])[] }

const SECTIONS: Bloc[] = [
  {
    t: '1. Qui nous sommes',
    p: [
      'WODBUD est une application de suivi et de programmation d’entraînement, offerte aux personnes qui s’entraînent seules ainsi qu’aux gyms qui gèrent des cours de groupe.',
      'Exploitant : [À COMPLÉTER : dénomination sociale légale, numéro d’entreprise du Québec (NEQ), adresse du siège].',
      'Responsable de la protection des renseignements personnels (RPRP) : [À COMPLÉTER : nom, titre, adresse courriel dédiée, téléphone]. La Loi 25 exige que ce titre et ces coordonnées soient publiés. Par défaut, la fonction revient à la personne ayant la plus haute autorité dans l’entreprise, à moins d’une délégation écrite.'
    ]
  },
  {
    t: '2. Les renseignements que nous recueillons',
    p: [
      'Nous ne recueillons que ce dont l’application a besoin pour fonctionner.',
      [
        'Compte : adresse courriel, mot de passe (stocké sous forme chiffrée à sens unique — nous ne le voyons jamais), nom affiché.',
        'Préférences : langue, thème d’affichage, type de portail choisi (particulier ou gym).',
        'Entraînement : séances, exercices, séries, répétitions, charges soulevées, RIR, durée et minutes actives, records personnels, rang et série de jours.',
        'Appartenance : les cours ou gyms auxquels vous êtes rattaché, et vos votes sur les entraînements proposés.',
        'Suivi corporel, si vous choisissez de l’utiliser : poids corporel, aliments consommés et valeurs nutritionnelles associées.',
        'Contenu que vous téléversez : vidéos de démonstration d’exercices.',
        'Données techniques : journaux de connexion et d’erreurs générés automatiquement par nos hébergeurs.'
      ]
    ]
  },
  {
    t: '3. Renseignements sensibles',
    p: [
      'Le poids corporel et le journal alimentaire touchent à la santé. Ils sont facultatifs : l’application fonctionne entièrement sans eux. Nous ne les recueillons que si vous les saisissez vous-même, et nous ne les utilisons jamais à d’autres fins que de vous les afficher et d’ajuster vos propres cibles.',
      'Nous ne posons aucun diagnostic. Le mannequin de charge musculaire est un outil de répartition du volume d’entraînement, pas un avis médical.',
      'Nous ne vendons aucun renseignement personnel, et nous n’en communiquons aucun à des fins publicitaires.'
    ]
  },
  {
    t: '4. Pourquoi nous les recueillons',
    p: [
      [
        'Créer et sécuriser votre compte, et vous authentifier.',
        'Afficher votre historique d’entraînement, vos progrès et vos records.',
        'Calculer la charge musculaire du mannequin et les suggestions qui en découlent.',
        'Faire fonctionner les cours de groupe : votes, présence, classement de la classe.',
        'Calculer votre rang et votre série de jours, et les partager uniquement si vous activez vous-même un lien de partage.',
        'Afficher l’interface dans votre langue et selon votre thème.',
        'Détecter les pannes et les abus, et respecter nos obligations légales.'
      ]
    ]
  },
  {
    t: '5. Sur quelle base nous les traitons',
    p: [
      'Votre consentement, donné librement et pour des fins précises, au moment où vous créez votre compte et chaque fois que vous activez une fonction facultative (suivi du poids, journal alimentaire, partage de rang).',
      'Vous pouvez retirer votre consentement en tout temps. Le retrait n’a pas d’effet rétroactif sur ce qui a déjà été fait légitimement, mais il met fin au traitement pour l’avenir et vous pouvez demander la suppression de votre compte.'
    ]
  }
]

SECTIONS.push(
  {
    t: '6. Qui d’autre y a accès',
    p: [
      'Nous faisons appel à des fournisseurs pour héberger et faire fonctionner l’application. Ils agissent pour notre compte, selon nos instructions, et n’ont pas le droit d’utiliser vos renseignements à leurs propres fins.',
      [
        'Supabase — base de données, authentification et stockage. Hébergement : région us-west-2 (Oregon, États-Unis).',
        'Vercel — hébergement et distribution de l’application web.',
        'Cloudflare R2 — stockage des vidéos de démonstration.',
        'Anthropic — l’assistant SonIA. Votre question et l’historique récent de la conversation sont transmis pour générer la réponse. Aucun identifiant de compte, aucun nom et aucune donnée de profil n’accompagnent la demande. N’y écrivez pas de renseignements personnels ou médicaux.',
        'Google — reconnaissance de texte lorsque vous importez la photo d’un programme papier. L’image est transmise pour en extraire le texte.'
      ],
      'Si vous êtes membre d’un gym, votre coach voit votre nom, votre présence, vos résultats d’entraînement et vos votes pour les cours auxquels vous appartenez. Il ne voit ni votre poids corporel, ni votre journal alimentaire, ni vos séances faites en solo hors du gym.',
      'Les autres membres de votre classe voient votre nom et vos résultats affichés au tableau de la classe.'
    ]
  },
  {
    t: '7. Communication hors Québec',
    p: [
      'Nos fournisseurs peuvent héberger ou traiter des données à l’extérieur du Québec, y compris aux États-Unis. Ces renseignements peuvent alors être soumis aux lois du pays d’accueil, incluant l’accès par des autorités étrangères.',
      'Avant toute communication de renseignements personnels hors Québec, la Loi 25 exige une évaluation des facteurs relatifs à la vie privée (EFVP), qui doit conclure que le traitement bénéficie d’une protection adéquate. [À COMPLÉTER : dater ton EFVP et conserver la conclusion écrite au dossier. Elle doit être faite AVANT la mise en ligne, pas après.]'
    ]
  },
  {
    t: '8. Combien de temps nous les gardons',
    p: [
      'Vos renseignements sont conservés tant que votre compte est actif.',
      [
        'Compte supprimé : vos renseignements personnels sont détruits ou anonymisés dans les 30 jours.',
        'Compte inactif depuis 24 mois : nous vous prévenons par courriel, puis nous supprimons le compte si vous ne réagissez pas.',
        'Journaux techniques : conservés au maximum 12 mois.',
        'Données que la loi nous oblige à garder (comptabilité, fiscalité) : conservées pour la durée prescrite, puis détruites.'
      ],
      'Une fois la finalité atteinte, les renseignements sont détruits ou anonymisés. Anonymisé veut dire qu’il devient impossible, de façon irréversible, de vous identifier.'
    ]
  },
  {
    t: '9. Vos droits',
    p: [
      'Vous pouvez, en tout temps et sans frais :',
      [
        'Accéder aux renseignements que nous détenons sur vous.',
        'Les faire rectifier s’ils sont inexacts, incomplets ou équivoques.',
        'Retirer votre consentement et demander la suppression de votre compte.',
        'Obtenir vos données dans un format technologique structuré et couramment utilisé, ou demander qu’elles soient transmises à un tiers — c’est le droit à la portabilité.',
        'Demander la cessation de la diffusion d’un renseignement, ou sa désindexation, lorsque la diffusion vous cause un préjudice sérieux.',
        'Être informé et vous opposer à toute décision fondée exclusivement sur un traitement automatisé.'
      ],
      'Pour exercer un de ces droits, écrivez au RPRP à [À COMPLÉTER : adresse courriel du RPRP]. Nous répondons dans les 30 jours suivant la réception de votre demande. Un refus est motivé par écrit et vous indique les recours possibles.'
    ]
  },
  {
    t: '10. Témoins et stockage local',
    p: [
      'WODBUD n’utilise aucun témoin publicitaire ni aucun outil de suivi comportemental à des fins de marketing.',
      'Nous utilisons le stockage local de votre navigateur pour garder votre session ouverte, mémoriser votre langue et votre thème, et permettre à l’application de fonctionner hors ligne. Vous pouvez effacer ce stockage à partir des réglages de votre navigateur : vous serez alors déconnecté.',
      'Nous n’utilisons aucune technologie de géolocalisation, d’identification ou de profilage.'
    ]
  },
  {
    t: '11. Sécurité et incidents',
    p: [
      'Les accès à la base de données sont restreints par des politiques de sécurité au niveau des lignes : un membre ne peut lire que ses propres données et celles que sa classe rend visibles. Les mots de passe sont chiffrés à sens unique. Les communications sont chiffrées en transit.',
      'Aucun système n’est infaillible. En cas d’incident de confidentialité présentant un risque de préjudice sérieux, nous vous en avisons ainsi que la Commission d’accès à l’information avec diligence, et nous consignons l’incident à un registre, comme la loi l’exige.'
    ]
  },
  {
    t: '12. Mineurs',
    p: [
      'WODBUD n’est pas destiné aux personnes de moins de 14 ans. Pour un mineur de moins de 14 ans, le consentement doit être donné par le titulaire de l’autorité parentale. Si vous constatez qu’un enfant nous a fourni des renseignements sans ce consentement, écrivez au RPRP et nous les supprimerons.'
    ]
  },
  {
    t: '13. Modifications',
    p: [
      'Nous pouvons modifier cette politique. La date de dernière mise à jour est affichée en haut de la page. Si un changement touche de façon importante vos droits ou l’usage de vos renseignements, nous vous en avisons dans l’application ou par courriel avant qu’il prenne effet.'
    ]
  },
  {
    t: '14. Recours',
    p: [
      'Si notre réponse ne vous satisfait pas, vous pouvez porter plainte auprès de la Commission d’accès à l’information du Québec (cai.gouv.qc.ca), ou du Commissariat à la protection de la vie privée du Canada (priv.gc.ca) si votre situation relève de la LPRPDE.'
    ]
  }
)

function renderChunk(chunk: string | string[], i: number) {
  if (Array.isArray(chunk)) {
    return (
      <ul key={i} style={{ margin: '0 0 0.9rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {chunk.map((li, j) => (
          <li key={j} style={{ fontSize: '0.9375rem', lineHeight: 1.65 }}>
            {highlight(li)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p key={i} style={{ margin: '0 0 0.9rem', fontSize: '0.9375rem', lineHeight: 1.7 }}>
      {highlight(chunk)}
    </p>
  )
}

/** Rend les blocs [À COMPLÉTER] impossibles à manquer avant la mise en ligne. */
function highlight(text: string) {
  const parts = text.split(/(\[À COMPLÉTER[^\]]*\])/g)
  return parts.map((part, i) =>
    part.startsWith('[À COMPLÉTER') ? (
      <mark
        key={i}
        style={{ background: 'rgba(255,77,0,0.18)', color: 'var(--orange)', padding: '0 0.25rem', fontWeight: 600 }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--black)', color: 'var(--white)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link
          to='/'
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            textDecoration: 'none'
          }}
        >
          &larr; WODBUD
        </Link>

        <h1
          style={{
            fontFamily: 'var(--font-d)',
            fontSize: '1.75rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: '1.25rem 0 0.4rem'
          }}
        >
          Politique de confidentialité
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0 0 2rem' }}>
          Dernière mise à jour : {DERNIERE_MAJ} · Loi 25 (Québec) et LPRPDE (Canada)
        </p>

        {SECTIONS.map((section) => (
          <section key={section.t} style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-d)',
                fontSize: '1rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                margin: '0 0 0.7rem',
                paddingBottom: '0.4rem',
                borderBottom: '1px solid var(--border)'
              }}
            >
              {section.t}
            </h2>
            {section.p.map(renderChunk)}
          </section>
        ))}

        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          Ce document a été rédigé à partir des obligations de la Loi 25 et de la LPRPDE et des données
          réellement collectées par WODBUD. Il ne constitue pas un avis juridique. Faites-le relire par un
          conseiller juridique avant la mise en ligne, et remplissez les blocs surlignés.
        </p>
      </div>
    </main>
  )
}
