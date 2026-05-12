import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// FR
import frCommon from './locales/fr/common.json'
import frExercises from './locales/fr/exercises.json'
import frWorkouts from './locales/fr/workouts.json'

// EN
import enCommon from './locales/en/common.json'
import enExercises from './locales/en/exercises.json'
import enWorkouts from './locales/en/workouts.json'

// ES
import esCommon from './locales/es/common.json'
import esExercises from './locales/es/exercises.json'
import esWorkouts from './locales/es/workouts.json'

i18n
  .use(LanguageDetector)       // langue du navigateur
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',         // langue par défaut
    supportedLngs: ['fr', 'en', 'es'],
    defaultNS: 'common',
    ns: ['common', 'exercises', 'workouts'],
    resources: {
      fr: { common: frCommon, exercises: frExercises, workouts: frWorkouts },
      en: { common: enCommon, exercises: enExercises, workouts: enWorkouts },
      es: { common: esCommon, exercises: esExercises, workouts: esWorkouts },
    },
    interpolation: {
      escapeValue: false        
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fitnessapp_lang'
    }
  })

export default i18n