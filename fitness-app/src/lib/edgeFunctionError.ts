/**
 * `supabase.functions.invoke()` ne lève pas sur un statut non-2xx : il
 * renvoie une erreur dont le message est générique (« non-2xx status
 * code »). Le vrai message envoyé par la fonction est dans le corps de la
 * réponse HTTP, accessible via `context` (ou `response` selon la version du
 * SDK). Même logique que `readFunctionError` dans `r2.ts`, extraite ici pour
 * être réutilisée sans dupliquer le parsing.
 */
export async function readFunctionErrorMessage(error: unknown): Promise<string | null> {
  const source = error as { context?: unknown; response?: unknown } | null
  const raw = source?.context ?? source?.response
  if (!(raw instanceof Response)) return null
  try {
    const body = (await raw.clone().json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}
