import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { fetchMyCenter, isStaff, type MyCenter } from '../../lib/center'

interface Suggestion { id: string; message: string; anonymous: boolean; author_name: string | null; status: string; created_at: string }

/**
 * 6.5 : boîte de réception des suggestions des membres, pour le proprio et
 * les entraîneurs. Le nom d'un message anonyme n'arrive jamais jusqu'ici
 * (la base le masque). « Traitée » retire le message des nouvelles ;
 * le membre voit ce changement de son côté.
 */
export default function CenterSuggestionsInbox() {
  const { t, i18n } = useTranslation('common')
  const [center, setCenter] = useState<MyCenter | null>(null)
  const [status, setStatus] = useState<'new' | 'done'>('new')
  const [items, setItems] = useState<Suggestion[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async (centerId: string, s: 'new' | 'done') => {
    const { data, error: err } = await supabase.rpc('get_center_suggestions', { p_center: centerId, p_status: s })
    if (err) throw err
    return (data ?? []) as Suggestion[]
  }, [])

  useEffect(() => {
    let alive = true
    fetchMyCenter().then((c) => { if (alive && c && isStaff(c.role)) setCenter(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!center) return
    let alive = true
    load(center.center.id, status).then((d) => { if (alive) setItems(d) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [center, status, load])

  async function setDone(s: Suggestion, next: 'new' | 'done') {
    setBusy(s.id)
    setError(false)
    try {
      const { error: err } = await supabase.rpc('set_center_suggestion_status', { p_id: s.id, p_status: next })
      if (err) throw err
      setItems((list) => (list ?? []).filter((x) => x.id !== s.id))
    } catch {
      setError(true)
    } finally {
      setBusy(null)
    }
  }

  if (!center) return null

  return (
    <section className="wb-home-sec">
      <div className="wb-sec">
        <h2>
          {t('suggestions.inbox_title')}
          {status === 'new' && items && items.length > 0 && <span className="wb-ph-count">{items.length}</span>}
        </h2>
        <div className="wb-links-chips">
          {(['new', 'done'] as const).map((s) => (
            <button key={s} type="button" className="wb-chip" aria-pressed={status === s} onClick={() => { setItems(null); setStatus(s) }}>
              {t(`suggestions.filter_${s}`)}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="wb-rec-error" role="alert">{t('errors.generic')}</p>}
      {items === null ? null : items.length === 0 ? (
        <div className="wb-card wb-review-empty">{status === 'new' ? t('suggestions.inbox_empty') : t('suggestions.inbox_empty_done')}</div>
      ) : (
        <ul className="wb-card wb-list wb-support-inbox">
          {items.map((s) => (
            <li key={s.id}>
              <div className="wb-support-meta">
                <span className={`wb-pill${s.anonymous ? '' : ' wb-pill--orange'}`}>
                  {s.anonymous ? t('suggestions.anonymous_label') : (s.author_name ?? '—')}
                </span>
                <span>{new Date(s.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="wb-support-msg">{s.message}</p>
              <div className="wb-review-actions">
                <button
                  type="button"
                  className={`wb-btn wb-btn--sm ${status === 'new' ? 'wb-btn--primary' : 'wb-btn--ghost'}`}
                  disabled={busy !== null}
                  onClick={() => { void setDone(s, status === 'new' ? 'done' : 'new') }}
                >
                  {status === 'new' ? t('suggestions.mark_done') : t('suggestions.reopen')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
