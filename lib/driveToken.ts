/**
 * Centralized Google Drive OAuth token management.
 * Shared by DriveImageInput, DriveAuthButton, and review page.
 *
 * Token lifecycle:
 *  - On first click of DriveAuthButton → popup consent → token saved ~55 min
 *  - Subsequent requests → silent refresh (no popup) until user disconnects
 *  - clearToken() → forgets token; next request will need new consent
 */

const LS_KEY = 'bom_gdrive_token'
const LS_EXP = 'bom_gdrive_token_exp'

let _token: string | null = null
let _tokenExpiry = 0
const _listeners: Set<() => void> = new Set()

// ── Pub/sub for token state changes ──────────────────────────────────────────

function notifyListeners() {
  _listeners.forEach(fn => { try { fn() } catch {} })
}

/** Subscribe to token state changes. Returns an unsubscribe function. */
export function onTokenChange(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

// ── Token cache ───────────────────────────────────────────────────────────────

function loadCachedToken() {
  try {
    const t = localStorage.getItem(LS_KEY)
    const exp = Number(localStorage.getItem(LS_EXP) ?? 0)
    if (t && exp > Date.now()) {
      _token = t
      _tokenExpiry = exp
    }
  } catch {}
}

function saveToken(token: string, expiresIn: number) {
  _token = token
  _tokenExpiry = Date.now() + (expiresIn - 300) * 1000  // 5-min buffer
  try {
    localStorage.setItem(LS_KEY, token)
    localStorage.setItem(LS_EXP, String(_tokenExpiry))
  } catch {}
  notifyListeners()
}

/** Remove cached token and notify all listeners. */
export function clearToken() {
  _token = null
  _tokenExpiry = 0
  try {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_EXP)
  } catch {}
  notifyListeners()
}

/** Returns true if a valid, non-expired token is cached. */
export function isAuthenticated(): boolean {
  if (!_token) loadCachedToken()
  return !!_token && Date.now() < _tokenExpiry
}

// ── OAuth client init ─────────────────────────────────────────────────────────

function clientIdOk(): boolean {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  return !!id && !id.includes('your-google') && !id.includes('placeholder')
}

function requestToken(prompt: '' | 'consent'): Promise<string | null> {
  if (!clientIdOk()) return Promise.resolve(null)
  const g = (window as any).google
  if (!g?.accounts?.oauth2) return Promise.resolve(null)

  return new Promise(resolve => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (res: any) => {
        if (res?.access_token) {
          saveToken(res.access_token, res.expires_in ?? 3600)
          resolve(res.access_token)
        } else {
          clearToken()
          resolve(null)
        }
      },
      error_callback: () => { clearToken(); resolve(null) },
    })
    client.requestAccessToken({ prompt })
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns cached token or attempts a silent refresh.
 * Never shows a popup. Returns null if no valid token is available.
 */
export function getTokenSilent(): Promise<string | null> {
  if (!_token) loadCachedToken()
  if (_token && Date.now() < _tokenExpiry) return Promise.resolve(_token)
  if (!clientIdOk()) return Promise.resolve(null)
  // prompt: '' → silent re-issue if already consented, no popup if not
  return requestToken('')
}

/**
 * Returns token, showing an OAuth popup if needed (explicit user action).
 * Call this only from a user gesture (e.g. button click).
 */
export function getTokenWithConsent(): Promise<string | null> {
  return requestToken('consent')
}

// ── Drive fetch helpers ───────────────────────────────────────────────────────

/**
 * Fetch a Drive file and return a blob URL for display in the current window.
 * Returns null if no token or request fails.
 */
export async function fetchDriveBlob(fileId: string): Promise<string | null> {
  const token = await getTokenSilent()
  if (!token) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) { clearToken(); return null }
    if (!res.ok) return null
    return URL.createObjectURL(await res.blob())
  } catch { return null }
}

/**
 * Fetch a Drive file and return a data: URI.
 * Required for print popups (blob URLs don't survive window.open).
 */
export async function fetchDriveDataUri(fileId: string): Promise<string | null> {
  const token = await getTokenSilent()
  if (!token) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) { clearToken(); return null }
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buf = await res.arrayBuffer()
    let binary = ''
    new Uint8Array(buf).forEach(b => { binary += String.fromCharCode(b) })
    return `data:${contentType};base64,${btoa(binary)}`
  } catch { return null }
}
