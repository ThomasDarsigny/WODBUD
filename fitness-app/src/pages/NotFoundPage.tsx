import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'

/**
 * Adresse inconnue dans l'app (lien périmé, faute de frappe) : on le dit, au
 * lieu de renvoyer en silence à l'accueil (constat 13 de l'audit). Les
 * adresses inconnues du site tombent, elles, sur public/404.html (Vercel).
 */
export default function NotFoundPage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('not_found.title')} | WODBUD`)

  return (
    <main className="wb-auth-page">
      <div className="wb-auth-wrap">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>
        <section className="wb-auth-card" aria-labelledby="not-found-title">
          <h1 id="not-found-title" className="wb-auth-title">{t('not_found.title')}</h1>
          <p className="wb-auth-sub">{t('not_found.text')}</p>
          <Link to="/" replace className="wb-btn wb-btn--primary wb-btn--block">{t('not_found.home')}</Link>
        </section>
      </div>
    </main>
  )
}
