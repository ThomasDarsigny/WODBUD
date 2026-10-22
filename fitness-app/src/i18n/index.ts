import i18n, { type BackendModule } from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Le français est livré avec l'app : c'est la langue de repli, et celle du
// rendu statique. L'anglais et l'espagnol ne se téléchargent que si on les
// choisit — un tiers du poids du démarrage en moins pour tout le monde.
import frCommon from './locales/fr/common.json'
import frExercises from './locales/fr/exercises.json'
import frWorkouts from './locales/fr/workouts.json'

const lazyLocales = import.meta.glob<{ default: Record<string, unknown> }>(['./locales/en/*.json', './locales/es/*.json'])

const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(lng, ns, callback) {
    const load = lazyLocales[`./locales/${lng}/${ns}.json`]
    if (!load) { callback(null, {}); return }
    load().then((m) => callback(null, m.default), (err: unknown) => callback(err as Error, false))
  }
}

i18n
  .use(lazyBackend)
  .use(LanguageDetector)       // langue du navigateur
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',         // langue par défaut
    supportedLngs: ['fr', 'en', 'es'],
    defaultNS: 'common',
    ns: ['common', 'exercises', 'workouts'],
    resources: {
      fr: { common: frCommon, exercises: frExercises, workouts: frWorkouts },
    },
    // Ressources livrées pour le français, le reste passe par lazyBackend.
    partialBundledLanguages: true,
    interpolation: {
      escapeValue: false        
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'wodbud_lang'
    }
  })

export default i18n