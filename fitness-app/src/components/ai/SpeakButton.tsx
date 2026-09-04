import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isSpeechSupported, speak, stopSpeaking } from '../../lib/speech'

/**
 * Bouton « écouter » sur une réponse de SonIA.
 *
 * Jamais de lecture automatique : dans un gym, une voix qui part toute seule
 * est une nuisance, et sur mobile les navigateurs exigent de toute façon un
 * geste de l'utilisateur avant de produire du son.
 */
export default function SpeakButton({ text }: { text: string }) {
  const { t, i18n } = useTranslation('common')
  const [speaking, setSpeaking] = useState(false)

  // Une réponse en cours de lecture ne doit pas continuer après la fermeture
  // de l'écran.
  useEffect(() => () => { stopSpeaking() }, [])

  if (!isSpeechSupported()) return null

  const lang = i18n.language.startsWith('fr')
    ? 'fr-CA'
    : i18n.language.startsWith('es')
      ? 'es-ES'
      : 'en-US'

  function toggle() {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    void speak(text, {
      lang,
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    })
  }

  return (
    <button
      onClick={toggle}
      aria-label={speaking ? t('ai.stop') : t('ai.speak')}
      title={speaking ? t('ai.stop') : t('ai.speak')}
      style={{
        background: 'transparent',
        border: `1px solid ${speaking ? 'var(--orange)' : 'var(--border)'}`,
        color: speaking ? 'var(--orange)' : 'var(--muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font-d)',
        fontSize: '0.6rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '0.18rem 0.5rem',
        marginLeft: 'auto',
        flexShrink: 0
      }}
    >
      {speaking ? `■ ${t('ai.stop')}` : `▶ ${t('ai.speak')}`}
    </button>
  )
}
