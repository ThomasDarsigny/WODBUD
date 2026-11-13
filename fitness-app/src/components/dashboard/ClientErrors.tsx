import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { groupClientErrors, type ClientErrorGroup } from '../../lib/clientErrors'
import Skeleton from '../ui/Skeleton'

/** Administration (4.5) : les erreurs remontées par les utilisateurs, regroupées par message. */
export default function ClientErrors() {
  const { t, i18n } = useTranslation('common')
  const [groups, setGroups] = useState<ClientErrorGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('client_errors')
      .select('id, created_at, kind, message, path, app_version')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error: err }) => {
        if (!alive) return
        if (err) { setError(err.message); setGroups([]) } else setGroups(groupClientErrors(data ?? []))
      })
    return () => { alive = false }
  }, [])

  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="wb-home-sec" aria-labelledby="client-errors-title">
      <div className="wb-sec"><h2 id="client-errors-title">{t('client_errors.title')}</h2></div>
      <p className="wb-set-hint is-lead">{t('client_errors.hint')}</p>
      {error && <p className="wb-rec-error" role="alert">{error}</p>}
      {groups === null ? (
        <Skeleton height={56} lines={3} />
      ) : groups.length === 0 ? (
        <div className="wb-empty"><p>{t('client_errors.empty')}</p></div>
      ) : (
        <ul className="wb-list">
          {groups.slice(0, 20).map((g) => (
            <li key={`${g.kind}|${g.message}`} className="wb-cerr">
              <div className="wb-cerr-head">
                <span className={`wb-pill${g.kind === 'render' ? ' wb-pill--orange' : ''}`}>{t(`client_errors.kind_${g.kind}`)}</span>
                <span className="wb-cerr-count">{t('client_errors.count', { count: g.count })}</span>
                <span className="wb-cerr-when">{when(g.lastAt)}</span>
              </div>
              <p className="wb-cerr-msg">{g.message}</p>
              {(g.paths.length > 0 || g.versions.length > 0) && (
                <p className="wb-cerr-meta">
                  {g.paths.slice(0, 3).join(' · ')}
                  {g.versions.length > 0 && ` — ${t('client_errors.versions')} ${g.versions.slice(0, 3).join(', ')}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
