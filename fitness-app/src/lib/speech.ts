/**
 * Synthèse vocale pour SonIA — Web Speech API, zéro dépendance, zéro coût.
 *
 * Tout se passe sur l'appareil : aucun audio n'est envoyé nulle part, donc
 * rien à déclarer de plus dans la politique de confidentialité. C'est la
 * moitié « SonIA qui parle » de la demande vocale; l'entrée vocale (STT) est
 * un autre problème, avec le bruit du gym et un support navigateur inégal.
 */

const CHUNK_MAX = 180

let keepAlive: number | null = null

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Les voix arrivent de façon asynchrone : au premier appel, getVoices() renvoie
 * souvent un tableau vide et ne se remplit qu'à l'événement `voiceschanged`.
 * Sans cette attente, la première lecture part avec la voix par défaut du
 * système — souvent anglophone sur un poste québécois.
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([])

  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', finish)
    window.setTimeout(finish, timeoutMs)
  })
}

/** fr-CA d'abord, puis n'importe quel français, puis la langue demandée. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null
  const base = lang.split('-')[0]

  if (base === 'fr') {
    const caQuebec = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'fr-ca')
    if (caQuebec) return caQuebec
  }

  const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base))
  return exact ?? null
}

/**
 * Découpe le texte en morceaux courts, aux frontières de phrase.
 *
 * Chrome coupe une utterance trop longue au bout d'une quinzaine de secondes.
 * Enfiler des morceaux courts contourne le problème et rend l'arrêt plus
 * réactif : on interrompt entre deux phrases plutôt qu'au milieu d'un pavé.
 */
export function chunkText(text: string, max = CHUNK_MAX): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length === 0) return []
  if (clean.length <= max) return [clean]

  const sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) ?? [clean]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > max) {
      if (current.trim()) { chunks.push(current.trim()); current = '' }
      // Phrase interminable : on tombe sur une découpe brute par longueur.
      for (let i = 0; i < sentence.length; i += max) {
        chunks.push(sentence.slice(i, i + max).trim())
      }
      continue
    }
    if ((current + sentence).length > max) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean)
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return
  if (keepAlive !== null) {
    window.clearInterval(keepAlive)
    keepAlive = null
  }
  window.speechSynthesis.cancel()
}

export interface SpeakOptions {
  lang?: string
  rate?: number
  onEnd?: () => void
  onError?: () => void
}

/** Lit le texte à voix haute. Toute lecture en cours est interrompue. */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!isSpeechSupported()) return
  const { lang = 'fr-CA', rate = 1, onEnd, onError } = options

  stopSpeaking()

  const chunks = chunkText(text)
  if (chunks.length === 0) {
    onEnd?.()
    return
  }

  const voices = await loadVoices()
  const voice = pickVoice(voices, lang)

  // Chrome suspend la synthèse quand l'onglet perd le focus; un resume()
  // périodique la relance sans effet audible quand tout va bien.
  keepAlive = window.setInterval(() => {
    if (window.speechSynthesis.speaking) window.speechSynthesis.resume()
  }, 5000)

  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk)
    utterance.lang = voice?.lang ?? lang
    utterance.rate = rate
    if (voice) utterance.voice = voice

    if (index === chunks.length - 1) {
      utterance.onend = () => {
        if (keepAlive !== null) {
          window.clearInterval(keepAlive)
          keepAlive = null
        }
        onEnd?.()
      }
    }
    utterance.onerror = () => {
      if (keepAlive !== null) {
        window.clearInterval(keepAlive)
        keepAlive = null
      }
      onError?.()
    }

    window.speechSynthesis.speak(utterance)
  })
}
