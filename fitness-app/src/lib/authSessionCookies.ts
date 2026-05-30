import type { Session } from '@supabase/supabase-js'

function canSyncAuthCookies(): boolean {
  if (import.meta.env.PROD) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const isPlainViteDevPort = window.location.port === '5173'

  return isLocalhost && !isPlainViteDevPort
}

async function safeCall(endpoint: string, init: RequestInit): Promise<void> {
  if (!canSyncAuthCookies()) {
    return
  }

  try {
    const response = await fetch(endpoint, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    })

    if (!response.ok) {
      return
    }
  } catch {
    // Cookie sync is best-effort and should never break app auth flow.
  }
}

export async function syncAuthSessionCookies(session: Session): Promise<void> {
  await safeCall('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at
    })
  })
}

export async function clearAuthSessionCookies(): Promise<void> {
  await safeCall('/api/auth/session', {
    method: 'DELETE'
  })
}
