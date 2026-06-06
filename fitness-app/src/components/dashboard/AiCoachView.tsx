import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Propose une séance full body pour débutants',
  'Quels exercices pour travailler les ischio-jambiers ?',
  'Crée un WOD AMRAP de 20 minutes',
  'Exercices de mobilité pour les épaules',
]

export default function AiCoachView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--orange)',
              background: 'rgba(255,77,0,0.1)',
              border: '1px solid rgba(255,77,0,0.3)',
              padding: '0.2rem 0.5rem'
            }}
          >
            AI
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0
            }}
          >
            Coach IA
          </h1>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.4rem', marginBottom: 0 }}>
          Pose tes questions sur les exercices et séances d'entraînement
        </p>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: 0
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: '2rem'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-d)',
                  fontSize: '2.5rem',
                  letterSpacing: '0.1em',
                  opacity: 0.15,
                  marginBottom: '0.5rem'
                }}
              >
                AI
              </div>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: '0.9rem',
                  maxWidth: '360px',
                  textAlign: 'center',
                  lineHeight: 1.6
                }}
              >
                Ton assistant coach. Il connaît tous les exercices de ta bibliothèque et peut t'aider à construire des séances.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '480px' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    background: 'var(--dark)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    padding: '0.5rem 0.85rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-b)',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,77,0,0.4)'
                    e.currentTarget.style.color = 'var(--white)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '72%',
                padding: '0.85rem 1.1rem',
                background:
                  msg.role === 'user'
                    ? 'rgba(255,77,0,0.12)'
                    : 'var(--dark)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(255,77,0,0.3)' : 'var(--border)'}`,
                fontSize: '0.88rem',
                lineHeight: 1.65,
                color: 'var(--white)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {msg.role === 'assistant' && (
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-d)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--orange)',
                    marginBottom: '0.5rem'
                  }}
                >
                  Coach IA
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '0.85rem 1.1rem',
                background: 'var(--dark)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--orange)',
                    display: 'inline-block',
                    animation: `pulse 1.2s ease-in-out ${n * 0.2}s infinite`,
                    opacity: 0.6
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,50,50,0.08)',
              border: '1px solid rgba(255,50,50,0.3)',
              color: '#ff6b6b',
              fontSize: '0.82rem'
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '1rem 2rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--black)'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            background: 'var(--dark)',
            border: '1px solid var(--border)',
            padding: '0.75rem 1rem',
            transition: 'border-color 0.15s'
          }}
          onFocus={() => {}}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pose une question sur les exercices ou séances..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--white)',
              fontFamily: 'var(--font-b)',
              fontSize: '0.88rem',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflow: 'auto'
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? 'var(--orange)' : 'rgba(255,77,0,0.2)',
              border: 'none',
              color: input.trim() && !loading ? 'var(--black)' : 'rgba(255,77,0,0.4)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              padding: '0.5rem 1rem',
              fontFamily: 'var(--font-d)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
          >
            {loading ? '...' : 'Envoyer'}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem', marginBottom: 0 }}>
          Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
