import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import SpeakButton from '../ai/SpeakButton'
import AiPersonaPicker from '../ai/AiPersonaPicker'
import { avatarUrl, DEFAULT_PERSONA, fetchPersona, type AiPersona } from '../../lib/aiPersona'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiCoachView() {
  const { t } = useTranslation('common')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [persona, setPersona] = useState<AiPersona>(DEFAULT_PERSONA)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPersona().then((p) => { if (alive) setPersona(p) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const history = messages.slice(-10) // keep last 10 messages for context

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnecte-toi.')

      const { data, error: fnError } = await supabase.functions.invoke('ai-coach', {
        body: { message: trimmed, history },
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="wb-ai">
      <header className="wb-ai-head">
        <img className="wb-ai-avatar wb-ai-avatar--img" src={avatarUrl(persona.avatar)} alt="" width={44} height={44} />
        <div className="wb-grow">
          <h1>{t('ai.name')}</h1>
          <p>{t('ai.subtitle')} · {t(`ai.tones.${persona.tone}`)}</p>
        </div>
        <button type="button" className="wb-btn wb-btn--secondary wb-btn--sm" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          {t('ai.persona_edit')}
        </button>
      </header>

      {editing && <AiPersonaPicker value={persona} onSaved={setPersona} onClose={() => setEditing(false)} />}

      <div className="wb-ai-thread">
        {messages.length === 0 && (
          <div className="wb-ai-empty">
            <p>{t('ai.intro')}</p>
            <div className="wb-ai-suggest">
              {(t('ai.suggestions', { returnObjects: true }) as string[]).map((s) => (
                <button key={s} type="button" className="wb-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`wb-ai-msg ${msg.role === 'user' ? 'is-me' : 'is-bot'}`}>
            <div className="wb-ai-bubble">
              {msg.role === 'assistant' && (
                <span className="wb-ai-who">
                  <img src={avatarUrl(persona.avatar)} alt="" width={20} height={20} className="wb-ai-who-img" />
                  {t('ai.name')}
                  <SpeakButton text={msg.content} />
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="wb-ai-msg is-bot">
            <div className="wb-ai-bubble wb-ai-typing" aria-label="…">
              <i /><i /><i />
            </div>
          </div>
        )}

        {error && <div className="wb-rec-error" role="alert">{error}</div>}

        <div ref={bottomRef} />
      </div>

      <div className="wb-ai-compose">
        <div className="wb-ai-box">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.placeholder')}
            aria-label={t('ai.placeholder')}
            disabled={loading}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            type="button"
            className="wb-ai-send"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label={t('ai.send')}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
