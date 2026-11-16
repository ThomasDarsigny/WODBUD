import { describe, expect, it } from 'vitest'
import { authCallbackPath, OAUTH_REDIRECT_URL } from './authCallback'

describe('retour de Google / Apple dans l’app (A2)', () => {
  it('mène à /auth/callback avec le code, marqué flow=oauth', () => {
    expect(authCallbackPath(`${OAUTH_REDIRECT_URL}?code=abc-123`)).toBe('/auth/callback?code=abc-123&flow=oauth')
  })

  it('garde l’erreur du fournisseur, de la requête comme de l’ancre', () => {
    expect(authCallbackPath(`${OAUTH_REDIRECT_URL}?error=access_denied&error_description=User+cancelled`))
      .toBe('/auth/callback?error=access_denied&error_description=User+cancelled&flow=oauth')
    expect(authCallbackPath(`${OAUTH_REDIRECT_URL}#error=server_error`)).toBe('/auth/callback?error=server_error&flow=oauth')
  })

  it('ne dépend pas de la façon dont le WebView lit les adresses à schéma propre', () => {
    expect(authCallbackPath(OAUTH_REDIRECT_URL)).toBe('/auth/callback?flow=oauth')
    expect(authCallbackPath(`${OAUTH_REDIRECT_URL}/?code=a%2Fb`)).toBe('/auth/callback?code=a%2Fb&flow=oauth')
  })

  it('ignore toute autre adresse (elle passe par les liens du site, ou rien)', () => {
    expect(authCallbackPath('com.wodbud.app://autre/chose?code=x')).toBeNull()
    expect(authCallbackPath('https://fitness-ruddy-three.vercel.app/auth/callback?code=x')).toBeNull()
    expect(authCallbackPath('autre.app://auth/callback?code=x')).toBeNull()
    expect(authCallbackPath('pas une adresse')).toBeNull()
  })
})
