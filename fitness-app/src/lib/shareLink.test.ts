import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareLink } from './shareLink'

const input = { title: 'Cours', text: 'Rejoins mon cours', url: 'https://wodbud.com/join/abc' }

function setNavigator(nav: Partial<Navigator>) {
  vi.stubGlobal('navigator', nav)
}

afterEach(() => { vi.unstubAllGlobals() })

describe('shareLink', () => {
  it('ouvre la feuille de partage avec le message prérempli', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    setNavigator({ share })
    expect(await shareLink(input)).toBe('shared')
    expect(share).toHaveBeenCalledWith(input)
  })

  it('ne signale rien si la personne ferme la feuille', async () => {
    const writeText = vi.fn()
    setNavigator({ share: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')), clipboard: { writeText } as unknown as Clipboard })
    expect(await shareLink(input)).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copie le lien quand le partage n’existe pas ou échoue', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNavigator({ clipboard: { writeText } as unknown as Clipboard })
    expect(await shareLink(input)).toBe('copied')
    setNavigator({ share: vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError')), clipboard: { writeText } as unknown as Clipboard })
    expect(await shareLink(input)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(input.url)
  })

  it('rend « failed » si même la copie est refusée', async () => {
    setNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } as unknown as Clipboard })
    expect(await shareLink(input)).toBe('failed')
  })
})
