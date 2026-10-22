/**
 * Signaux de séance en salle : bips, vibration, écran allumé.
 *
 * Le téléphone est posé au sol à trois mètres : on ne le regarde pas, on
 * l'entend. Tout est facultatif — un navigateur qui ne connaît pas une API
 * (vibration sur iPhone, verrou d'écran sur un vieux Safari) ne perd que ce
 * signal-là, jamais le chrono.
 */

const SOUND_KEY = 'wodbud_gym_sound'

type AudioCtor = typeof AudioContext
let ctx: AudioContext | null = null

/**
 * iOS n'autorise le son qu'après un geste : on l'appelle depuis les boutons
 * (démarrer, reprendre, mode salle) pour que les bips suivants passent.
 */
export function unlockAudio(): void {
  try {
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext)
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, ms: number, at = 0): void {
  if (!ctx || ctx.state !== 'running') return
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  // Attaque et relâche courtes : sans elles, l'onde carrée claque.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + ms / 1000 + 0.02)
}

function vibrate(pattern: number | number[]): void {
  try { navigator.vibrate?.(pattern) } catch { /* non pris en charge */ }
}

export type Cue = 'tick' | 'work' | 'rest' | 'done'

export function playCue(cue: Cue, sound: boolean): void {
  if (sound) {
    if (cue === 'tick') tone(660, 120)
    else if (cue === 'work') tone(990, 450)
    else if (cue === 'rest') tone(440, 450)
    else { tone(990, 220); tone(990, 220, 0.3); tone(1320, 600, 0.6) }
  }
  if (cue === 'tick') vibrate(60)
  else if (cue === 'work') vibrate(300)
  else if (cue === 'rest') vibrate([120, 80, 120])
  else vibrate([300, 120, 300, 120, 600])
}

export function readSoundPref(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== '0' } catch { return true }
}

export function writeSoundPref(on: boolean): void {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0') } catch { /* mode privé */ }
}

/**
 * Garde l'écran allumé tant que `active`. Le système relâche le verrou quand
 * l'onglet passe en arrière-plan : on le redemande au retour.
 */
export function holdScreenAwake(): () => void {
  type Sentinel = { release: () => Promise<void> }
  const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock
  if (!wl) return () => {}
  let sentinel: Sentinel | null = null
  let stopped = false
  const acquire = () => {
    if (stopped || document.visibilityState !== 'visible') return
    wl.request('screen').then((s) => {
      if (stopped) void s.release()
      else sentinel = s
    }).catch(() => { /* batterie faible ou refusé : le chrono continue */ })
  }
  acquire()
  document.addEventListener('visibilitychange', acquire)
  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', acquire)
    void sentinel?.release().catch(() => {})
    sentinel = null
  }
}
