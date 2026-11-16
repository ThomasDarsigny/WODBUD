import { describe, expect, it } from 'vitest'
import { inAppPath } from './nativeLinks'
import { PUBLIC_SITE_URL } from './publicUrl'

describe('liens du site ouverts dans l’app (A3)', () => {
  it('garde la page, la requête et l’ancre d’un lien du site', () => {
    expect(inAppPath(`${PUBLIC_SITE_URL}/join/AbC123`)).toBe('/join/AbC123')
    expect(inAppPath(`${PUBLIC_SITE_URL}/presence/c1?code=482913`)).toBe('/presence/c1?code=482913')
    expect(inAppPath(`${PUBLIC_SITE_URL}/communities/c0aa#defi`)).toBe('/communities/c0aa#defi')
  })

  it('accepte wodbud.com, une fois le domaine branché', () => {
    expect(inAppPath('https://wodbud.com/rejoindre/tok')).toBe('/rejoindre/tok')
    expect(inAppPath('https://www.wodbud.com/join/tok')).toBe('/join/tok')
  })

  it('refuse un autre site, un faux sous-domaine, http ou une adresse illisible', () => {
    expect(inAppPath('https://exemple.com/join/tok')).toBeNull()
    expect(inAppPath(`https://evil.${new URL(PUBLIC_SITE_URL).host}/join/tok`)).toBeNull()
    expect(inAppPath(`${PUBLIC_SITE_URL.replace('https:', 'http:')}/join/tok`)).toBeNull()
    expect(inAppPath('pas une adresse')).toBeNull()
  })
})
