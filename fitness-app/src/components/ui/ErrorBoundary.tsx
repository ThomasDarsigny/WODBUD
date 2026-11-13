import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import i18n from '../../i18n'
import { reportError } from '../../lib/errorReporting'

/**
 * Filet de sécurité (4.5) : un composant qui plante n'emporte plus tout l'écran
 * avec lui (page blanche). L'erreur est signalée, et la personne peut recharger
 * ou revenir à l'accueil.
 *
 * `full` : à la racine, en plein écran. Sans `full`, dans le contenu d'une page :
 * les menus restent utilisables. Les menus la remontent à chaque changement de
 * page (key), pour qu'une page cassée n'empêche pas d'aller ailleurs.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('render', error, info.componentStack ?? undefined)
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = (key: string) => i18n.t(key, { ns: 'common' })
    return (
      <div className={`wb-crash${this.props.full ? ' is-full' : ''}`} role="alert">
        <p className="wb-crash-title">{t('crash.title')}</p>
        <p className="wb-crash-body">{t('crash.body')}</p>
        <div className="wb-crash-actions">
          <button type="button" className="wb-btn wb-btn--primary" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
          <a className="wb-btn wb-btn--ghost" href="/">{t('crash.home')}</a>
        </div>
      </div>
    )
  }
}
