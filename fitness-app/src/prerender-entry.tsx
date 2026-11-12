import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import i18n from './i18n'
import ProfileChooser from './components/landing/ProfileChooser'
import LandingPage from './components/landing/LandingPage'
import type { LandingProfile } from './lib/landingProfile'

/**
 * Point d'entrée du prérendu (scripts/prerender.mjs), jamais chargé par le
 * navigateur. Rend en HTML statique, en français (langue de repli de l'app et
 * celle de la clientèle visée), la première page (7.2) et les trois pages
 * profil (7.6) : chacune a son fichier, son titre et sa description.
 *
 * Pas d'hydratation : main.tsx refait le rendu côté client par-dessus. Une
 * hydratation échouerait dès que la langue détectée n'est pas le français.
 */
export interface PrerenderedPage {
  path: string
  title: string
  description: string
  html: string
}

const PROFILE_PAGES: Array<{ path: string; profile: LandingProfile }> = [
  { path: '/centres', profile: 'center' },
  { path: '/membres', profile: 'member' },
  { path: '/perso', profile: 'perso' }
]

export async function renderPages(): Promise<PrerenderedPage[]> {
  await i18n.changeLanguage('fr')
  const t = i18n.getFixedT('fr', 'common')
  const pages: PrerenderedPage[] = [{
    path: '/',
    title: t('landing.chooser.meta_title'),
    description: t('landing.chooser.meta_description'),
    html: renderToString(<StaticRouter location="/"><ProfileChooser /></StaticRouter>)
  }]
  for (const { path, profile } of PROFILE_PAGES) {
    pages.push({
      path,
      title: t(`landing.profiles.${profile}.meta_title`),
      description: t(`landing.profiles.${profile}.meta_description`),
      html: renderToString(<StaticRouter location={path}><LandingPage profile={profile} /></StaticRouter>)
    })
  }
  return pages
}
