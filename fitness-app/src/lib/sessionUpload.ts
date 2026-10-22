import { supabase } from './supabase'
import { recalcBadges } from './badges'
import { linkSessionToPlan, localDate } from './scheduledWorkouts'
import { addResults, fetchMyResults, isNewRecord, type ExerciseResult, type ResultInput } from './records'

/**
 * Enregistrement d'une séance terminée — en ligne tout de suite, ou plus tard.
 *
 * Au sous-sol d'une box, le réseau tombe souvent. Une séance terminée hors
 * ligne part dans une file d'attente locale (localStorage) et s'envoie au
 * retour du réseau. Les identifiants sont générés ici, côté client : renvoyer
 * deux fois la même séance ne la compte jamais deux fois.
 *
 * Le serveur garde le dernier mot : l'heure de fin est la sienne, et une
 * séance commencée il y a plus de 12 h est refusée (040). Une séance restée
 * hors ligne trop longtemps est donc perdue — on le dit, on ne triche pas.
 */

export interface FinishedSession {
  id: string
  userId: string
  workoutId: string | null
  activityId: string | null
  scheduledId: string | null
  startedAt: string
  endedAt: string
  activeMinutes: number
  durationMinutes: number
  notes: string | null
  results: Array<ResultInput & { id: string }>
  /** Nom des mouvements, pour annoncer les records sans requête de plus. */
  names: Record<string, string>
}

export interface SessionSummary {
  activeMinutes: number
  totalMinutes: number
  currentStreak: number
  /** Clés des badges débloqués PAR cette séance. Vide la plupart du temps. */
  newBadges: string[]
  /**
   * Total AVANT la séance. Permet de comparer le rang d'avant et d'après sans
   * une requête de plus : le trigger ajoute exactement `activeMinutes`.
   */
  previousMinutes: number
  /** Records battus pendant la séance, avec le nom du mouvement. */
  newRecords: Array<{ name: string; result: ExerciseResult }>
  /** Vrai si la séance attend le réseau : totaux et badges viendront après. */
  offline: boolean
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(message)
}

/** Refus définitif du serveur (séance trop ancienne, durée impossible). */
function isRejected(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23514'
}

export async function uploadSession(entry: FinishedSession): Promise<SessionSummary> {
  // Upsert sans mise à jour : un renvoi de la même séance ne fait rien.
  const { error } = await supabase.from('workout_sessions').upsert({
    id: entry.id,
    user_id: entry.userId,
    workout_id: entry.workoutId,
    // Renseigné quand la séance est une activité cardio chronométrée.
    activity_exercise_id: entry.activityId,
    started_at: entry.startedAt,
    ended_at: entry.endedAt,
    performed_at: entry.startedAt,
    duration_minutes: entry.durationMinutes,
    active_minutes: entry.activeMinutes,
    notes: entry.notes
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error

  await linkSessionToPlan({
    sessionId: entry.id,
    scheduledId: entry.scheduledId,
    workoutId: entry.workoutId,
    date: localDate(new Date(entry.startedAt))
  })

  // Le trigger wodbud_recalc_profile_totals s'exécute dans la même
  // transaction que l'insertion : la lecture qui suit voit déjà les totaux
  // à jour, aucun calcul de rang n'est refait côté client.
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_minutes, current_streak')
    .eq('id', entry.userId)
    .single()

  // Les résultats notés partent avec la séance. Un échec ne la perd pas :
  // elle est déjà enregistrée, seuls les résultats seraient à renoter.
  const newRecords: SessionSummary['newRecords'] = []
  if (entry.results.length) {
    try {
      const ids = new Set(entry.results.map((r) => r.exerciseId))
      const previous = (await fetchMyResults()).filter((r) => ids.has(r.exerciseId))
      const saved = await addResults(entry.results.map((r) => ({ ...r, sessionId: entry.id })))
      for (const r of saved) {
        if (isNewRecord(previous, r)) newRecords.push({ name: entry.names[r.exerciseId] ?? '—', result: r })
      }
    } catch {
      // Voir plus haut : la séance compte quand même.
    }
  }

  // Décerné APRÈS la séance et ses résultats : la fonction lit les totaux que
  // le trigger vient de mettre à jour, et les records qu'on vient d'écrire.
  // Un échec ici ne doit pas perdre la séance, qui est déjà enregistrée —
  // d'où le repli silencieux.
  let newBadges: string[] = []
  try {
    newBadges = await recalcBadges()
  } catch {
    // Les badges seront rattrapés à l'ouverture de « Mon rang ».
  }

  const totalMinutes = profile?.total_minutes ?? entry.activeMinutes
  return {
    activeMinutes: entry.activeMinutes,
    totalMinutes,
    currentStreak: profile?.current_streak ?? 0,
    newBadges,
    newRecords,
    previousMinutes: Math.max(0, totalMinutes - entry.activeMinutes),
    offline: false
  }
}

/* ── File d'attente hors ligne ──────────────────────────────────────────── */

const OUTBOX_KEY = 'wodbud_session_outbox'

export function readOutbox(): FinishedSession[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    const list = raw ? (JSON.parse(raw) as FinishedSession[]) : []
    return Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string') : []
  } catch {
    return []
  }
}

function writeOutbox(list: FinishedSession[]): void {
  try {
    if (list.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(list))
    else localStorage.removeItem(OUTBOX_KEY)
  } catch {
    // Quota plein : rien de mieux à faire, la séance reste en mémoire.
  }
}

export function enqueue(entry: FinishedSession): void {
  writeOutbox([...readOutbox().filter((e) => e.id !== entry.id), entry])
}

export interface FlushReport {
  synced: number
  /** Refusées par le serveur (plus de 12 h) : retirées de la file. */
  rejected: number
  /** Encore en attente (réseau toujours absent, autre compte connecté). */
  pending: number
}

let flushing: Promise<FlushReport> | null = null

/** Envoie la file. Un seul envoi à la fois : les appels concurrents l'attendent. */
export function flushOutbox(userId: string): Promise<FlushReport> {
  flushing ??= (async () => {
    const report: FlushReport = { synced: 0, rejected: 0, pending: 0 }
    for (const entry of readOutbox()) {
      // Une séance appartient au compte qui l'a faite : un autre compte
      // connecté sur le même téléphone ne l'envoie pas.
      if (entry.userId !== userId) continue
      try {
        await uploadSession(entry)
        writeOutbox(readOutbox().filter((e) => e.id !== entry.id))
        report.synced++
      } catch (err) {
        if (isRejected(err)) {
          writeOutbox(readOutbox().filter((e) => e.id !== entry.id))
          report.rejected++
        } else if (isNetworkError(err)) {
          break
        }
      }
    }
    report.pending = readOutbox().length
    return report
  })().finally(() => { flushing = null })
  return flushing
}
