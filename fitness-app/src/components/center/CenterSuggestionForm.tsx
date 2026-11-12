import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { fetchMyCenter, type MyCenter } from '../../lib/center'

interface Mine { id: string; message: string; anonymous: boolean; status: string; created_at: string }

/**
 * 6.4 : un membre écrit à son centre (boîte à suggestions), en son nom ou
 * anonymement. Il relit ses derniers messages et voit s'ils ont été traités.
 * N'apparaît que pour un membre d'un centre.
 */
export default function CenterSuggestionForm() {
  const { t, i18n } = useTranslation('common')
  const [center, setCenter] = useState<MyCenter | null>(null)
  const [mine, setMine] = useState<Mine[]>([])
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function loadMine(centerId: string) {
    const { data } = await supabase.from('center_suggestions')
      .select('id, message, anonymous, status, created_at')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false })
      .limit(5)
    return (data ?? []) as Mine[]
  }

  useEffect(() => {
    let alive = true
    fetchMyCenter()
      .then(async (c) => {
        if (!alive || !c || c.role !== 'member') return
        setCenter(c)
        const list = await loadMine(c.center.id)
        if (alive) setMine(list)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = message.trim()
    if (!center || !text) return
    setBusy(true)
    setNotice(null)
    try {
      const { error } = await supabase.from('center_suggestions').insert({ center_id: center.center.id, message: text, anonymous })
      if (error) throw error
      setMessage('')
      setNotice({ kind: 'ok', text: t('suggestions.sent', { name: center.center.name }) })
      setMine(await loadMine(center.center.id))
    } catch (err) {
      const limited = String((err as { message?: string })?.message ?? '').includes('suggestion_rate_limited')
      setNotice({ kind: 'err', text: limited ? t('suggestions.too_many') : t('errors.generic') })
    } finally {
      setBusy(false)
    }
  }

  if (!center) return null

  return (
    <section className="wb-home-sec">
      <div className="wb-sec"><h2>{t('suggestions.title', { name: center.center.name })}</h2></div>
      <form className="wb-card wb-set-card wb-support" onSubmit={(e) => { void submit(e) }}>
        <p className="wb-set-hint" style={{ margin: 0 }}>{t('suggestions.hint')}</p>
        <label className="wb-sr-only" htmlFor="suggestion-message">{t('suggestions.message')}</label>
        <textarea
          id="suggestion-message"
          className="wb-input wb-support-text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('suggestions.placeholder')}
          maxLength={2000}
          rows={4}
          required
        />
        <label className="wb-suggest-anon">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span>{t('suggestions.anonymous')}</span>
        </label>
        <div className="wb-support-foot">
          <span className="wb-set-hint">{anonymous ? t('suggestions.anonymous_hint') : t('suggestions.signed_hint')}</span>
          <button type="submit" className="wb-btn wb-btn--primary" disabled={busy || !message.trim()}>
            {busy ? t('status.loading') : t('suggestions.send')}
          </button>
        </div>
        {notice && <p className={notice.kind === 'ok' ? 'wb-review-ok' : 'wb-rec-error'} role="status">{notice.text}</p>}

        {mine.length > 0 && (
          <div className="wb-suggest-mine">
            <p className="wb-set-label">{t('suggestions.mine')}</p>
            <ul>
              {mine.map((m) => (
                <li key={m.id}>
                  <span className="wb-suggest-text">{m.message}</span>
                  <span className="wb-set-hint">
                    {new Date(m.created_at).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                    {' · '}
                    {m.status === 'done' ? t('suggestions.status_done') : t('suggestions.status_new')}
                    {m.anonymous ? ` · ${t('suggestions.anonymous_short')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </section>
  )
}
