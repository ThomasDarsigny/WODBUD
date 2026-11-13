import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './authErrors'

const t = (key: string) => `«${key}»`

describe('authErrorMessage', () => {
  it('traduit les codes connus de GoTrue', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }, t)).toBe('«auth_errors.invalid_credentials»')
    expect(authErrorMessage({ code: 'email_exists' }, t)).toBe('«auth_errors.user_exists»')
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' }, t)).toBe('«auth_errors.rate_limit»')
  })

  it('distingue un mot de passe trouvé dans une fuite', () => {
    expect(authErrorMessage({ code: 'weak_password', reasons: ['pwned'] }, t)).toBe('«auth_errors.pwned_password»')
    expect(authErrorMessage({ code: 'weak_password', reasons: ['length'] }, t)).toBe('«auth_errors.weak_password»')
  })

  it('annonce un problème de réseau quand le serveur est injoignable', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, t)).toBe('«errors.network»')
  })

  it('garde le message d’origine pour un code inconnu, sinon le message générique', () => {
    expect(authErrorMessage({ code: 'mfa_challenge_expired', message: 'MFA challenge expired' }, t)).toBe('MFA challenge expired')
    expect(authErrorMessage(null, t)).toBe('«errors.generic»')
  })
})
