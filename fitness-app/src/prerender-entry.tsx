import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import i18n from './i18n'
import LandingPage from './components/landing/LandingPage'

/**
 * Point d'entrée du prérendu (scripts/prerender.mjs), jamais chargé par le
 * navigateur. Rend la landing en HTML statique, en français : c'est la langue
 * de repli de l'app et celle de la clientèle visée.
 *
 * Pas d'hydratation : main.tsx refait le rendu côté client par-dessus. Une
 * hydratation échouerait dès que la langue détectée n'est pas le français.
 */
export async function render(): Promise<string> {
  await i18n.changeLanguage('fr')
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>
  )
}
