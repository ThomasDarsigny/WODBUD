/**
 * Messages d'erreur de connexion et d'inscription, dans la langue de l'app.
 *
 * GoTrue (l'authentification Supabase) répond en anglais : « Invalid login
 * credentials », « Email rate limit exceeded »… Son code d'erreur est stable,
 * lui : on traduit les cas qu'une personne rencontre vraiment, et on garde le
 * message d'origine pour le reste plutôt que d'inventer.
 */

const KEYS: Record<string, string> = {
  invalid_credentials: 'auth_errors.invalid_credentials',
  email_not_confirmed: 'auth_errors.email_not_confirmed',
  user_already_exists: 'auth_errors.user_exists',
  email_exists: 'auth_errors.user_exists',
  weak_password: 'auth_errors.weak_password',
  over_email_send_rate_limit: 'auth_errors.rate_limit',
  over_request_rate_limit: 'auth_errors.rate_limit',
  email_address_invalid: 'auth_errors.email_invalid',
  signup_disabled: 'auth_errors.signup_disabled'
}

export function authErrorMessage(error: unknown, t: (key: string) => string): string {
  const e = (error ?? {}) as { code?: unknown; name?: unknown; message?: unknown; reasons?: unknown }
  // Mot de passe repéré dans une fuite connue (protection « leaked password » de Supabase).
  if (Array.isArray(e.reasons) && e.reasons.includes('pwned')) return t('auth_errors.pwned_password')
  const key = typeof e.code === 'string' ? KEYS[e.code] : undefined
  if (key) return t(key)
  // Réseau coupé ou serveur indisponible : rien que la personne puisse corriger dans le formulaire.
  if (e.name === 'AuthRetryableFetchError') return t('errors.network')
  return typeof e.message === 'string' && e.message ? e.message : t('errors.generic')
}
