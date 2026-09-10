/**
 * Icônes de navigation.
 *
 * Remplace les codes texte (ADM, LIB, CLS, RNK...) qui ne voulaient rien dire
 * pour quelqu'un qui ouvre l'app pour la première fois. Un pictogramme se
 * reconnaît sans lecture; « LIB » demande de deviner.
 *
 * Tracés au trait, 24×24, `currentColor` : l'icône prend automatiquement la
 * couleur de l'élément de menu, actif ou non, en thème clair comme sombre.
 * Aucune dépendance — une bibliothèque d'icônes coûterait 50 Ko pour douze
 * pictogrammes.
 */

export type NavIconName =
  | 'home'
  | 'admin'
  | 'exercises'
  | 'workout'
  | 'library'
  | 'session'
  | 'rank'
  | 'classes'
  | 'ai'
  | 'vote'
  | 'settings'
  | 'search'
  | 'calendar'
  | 'video'
  | 'play'
  | 'flame'
  | 'bolt'
  | 'grid'
  | 'star'
  | 'clock'

/** Un tracé par icône. Plusieurs sous-tracés séparés par un espace. */
const PATHS: Record<NavIconName, string[]> = {
  home: ['M3 10.6 12 3l9 7.6V20a1 1 0 0 1-1 1h-5v-6.5H9V21H4a1 1 0 0 1-1-1z'],
  // Bouclier : l'espace admin, réservé
  admin: ['M12 2.5 4.5 5.6v5.9c0 4.7 3.2 8.9 7.5 10 4.3-1.1 7.5-5.3 7.5-10V5.6z', 'M9.2 12.2l2 2 3.6-3.9'],
  // Haltère
  exercises: ['M4 9.5v5', 'M7 7v10', 'M17 7v10', 'M20 9.5v5', 'M7 12h10'],
  // Bloc-notes avec un plus : créer un WOD
  workout: ['M9 3.2h6v2.6H9z', 'M15 4.5h2a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h2', 'M12 10.5v6', 'M9 13.5h6'],
  // Piles : la bibliothèque de séances
  library: ['M12 3 3 7.3l9 4.3 9-4.3z', 'M3 12l9 4.3 9-4.3', 'M3 16.6 12 21l9-4.4'],
  // Cœur : la séance chronométrée
  session: ['M12 20.6 4.9 13.2a4.8 4.8 0 0 1 7.1-6.3 4.8 4.8 0 0 1 7.1 6.3z'],
  // Médaille
  rank: ['M12 14.5a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5z', 'M8.6 13.3 7.2 21.5l4.8-2.5 4.8 2.5-1.4-8.2'],
  // Deux personnes : les cours
  classes: ['M15.5 20.5v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.2a3.7 3.7 0 0 0-3.7 3.7v1.8', 'M9 11.8a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8', 'M21.5 20.5v-1.8a3.7 3.7 0 0 0-2.8-3.6', 'M15.8 4.2a3.9 3.9 0 0 1 0 7.6'],
  // Étincelle : SonIA
  ai: ['M11 3.5 12.7 8 17 9.7 12.7 11.4 11 15.9 9.3 11.4 5 9.7 9.3 8z', 'M18 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z'],
  // Barres de résultats
  vote: ['M3.5 20.5h17', 'M7 20.5v-5.5', 'M12 20.5V7.5', 'M17 20.5v-8.5'],
  // Curseurs de réglage
  settings: ['M4 7.5h8', 'M16 7.5h4', 'M4 16.5h4', 'M12 16.5h8', 'M14 4.5v6', 'M8 13.5v6'],
  // Loupe : « rien ne correspond au filtre », pas « rien n'existe »
  search: ['M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6z', 'M15.7 15.7 20.5 20.5'],
  // Calendrier : les cours et les échéances
  calendar: ['M4.5 6.5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z', 'M8 3.5v5', 'M16 3.5v5', 'M3.5 11.5h17'],
  // Caméra : emplacement d'une vidéo de démonstration, remplie ou non
  video: ['M3.5 6.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z', 'M15.5 10.4 21 7.4v9.2l-5.5-3z'],
  // Lecture
  play: ['M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19z', 'M10.3 8.4 15.8 12l-5.5 3.6z'],
  // Flamme : les séries d'assiduité
  flame: ['M12 21.5c3.9 0 6.4-2.6 6.4-6 0-4.4-3.9-5.6-3.1-10-2.9 1.4-3.1 4-4.5 5.4-.6-1-.6-2.2-.6-3-2 1.6-4.3 4.2-4.3 7.9 0 3.4 2.4 5.7 6.1 5.7z'],
  // Éclair : un premier fait, une pointe d'intensité
  bolt: ['M13.6 2.5 5.4 13.4h5.2L10 21.5l8.6-10.9h-5.3z'],
  // Grille : la variété d'agrès
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  // Étoile : l'ancienneté
  star: ['M12 3.4 14.6 9l6 .8-4.4 4.3 1.1 6L12 17.2l-5.3 2.9 1.1-6L3.4 9.8l6-.8z'],
  // Horloge : la durée d'une séance
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5.2l3.4 2']
}

interface Props {
  name: NavIconName
  /** Taille en px. 22 par défaut : lisible sans écraser le libellé. */
  size?: number
  /** Épaisseur du trait. Monte légèrement quand l'élément est actif. */
  strokeWidth?: number
}

export default function NavIcon({ name, size = 22, strokeWidth = 1.7 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      // L'icône double le libellé : elle n'apporte rien à un lecteur d'écran.
      aria-hidden='true'
      focusable='false'
      style={{ flexShrink: 0, display: 'block' }}
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
