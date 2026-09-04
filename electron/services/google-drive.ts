import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { BrowserWindow } from 'electron'
import { importGoogleCredentials, resolveGoogleClientId } from '../config/google-oauth.js'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'

export type DriveTokenBundle = {
  access_token: string
  refresh_token?: string
  expiry_date: number
  token_type: string
}

export type DrivePdfFile = {
  id: string
  name: string
  modifiedTime?: string
  size?: string
}

type DriveConfig = {
  clientId: string
}

let storageRoot = ''

export function initGoogleDriveStorage(root: string) {
  storageRoot = root
}

function configPath() {
  return path.join(storageRoot, 'google-oauth.json')
}

function tokenPath() {
  return path.join(storageRoot, 'google-drive-token.json')
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

export function getDriveConfig(): DriveConfig {
  const fromFile = readJson<DriveConfig>(configPath())
  const clientId = resolveGoogleClientId(storageRoot, fromFile?.clientId)
  return { clientId }
}

export function setDriveClientId(clientId: string) {
  writeJson(configPath(), { clientId: clientId.trim() })
}

export function importDriveCredentials(sourcePath: string) {
  const result = importGoogleCredentials(storageRoot, sourcePath)
  if (!result.ok) {
    throw new Error(result.error)
  }
  setDriveClientId(result.clientId)
  return getDriveAuthStatus()
}

function loadTokens(): DriveTokenBundle | null {
  return readJson<DriveTokenBundle>(tokenPath())
}

function saveTokens(tokens: DriveTokenBundle) {
  writeJson(tokenPath(), tokens)
}

function base64Url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function createPkce() {
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Boş port alınamadı'))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

async function exchangeAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<DriveTokenBundle> {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(json.error_description ?? json.error ?? 'OAuth token alınamadı'))
  }
  const expiresIn = Number(json.expires_in ?? 3600)
  return {
    access_token: String(json.access_token),
    refresh_token: json.refresh_token ? String(json.refresh_token) : undefined,
    token_type: String(json.token_type ?? 'Bearer'),
    expiry_date: Date.now() + expiresIn * 1000 - 60_000,
  }
}

async function refreshAccessToken(clientId: string, refreshToken: string): Promise<DriveTokenBundle> {
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(json.error_description ?? json.error ?? 'Token yenilenemedi'))
  }
  const prev = loadTokens()
  const expiresIn = Number(json.expires_in ?? 3600)
  const next: DriveTokenBundle = {
    access_token: String(json.access_token),
    refresh_token: prev?.refresh_token ?? refreshToken,
    token_type: String(json.token_type ?? 'Bearer'),
    expiry_date: Date.now() + expiresIn * 1000 - 60_000,
  }
  saveTokens(next)
  return next
}

async function getValidAccessToken(): Promise<string> {
  const config = getDriveConfig()
  if (!config.clientId) {
    throw new Error('Google Client ID yapılandırılmamış.')
  }
  const tokens = loadTokens()
  if (!tokens?.access_token) {
    throw new Error('Google Drive oturumu açık değil.')
  }
  if (tokens.expiry_date > Date.now()) {
    return tokens.access_token
  }
  if (!tokens.refresh_token) {
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.')
  }
  const refreshed = await refreshAccessToken(config.clientId, tokens.refresh_token)
  return refreshed.access_token
}

export function getDriveAuthStatus() {
  const config = getDriveConfig()
  const tokens = loadTokens()
  return {
    configured: Boolean(config.clientId),
    signedIn: Boolean(tokens?.access_token),
    clientId: config.clientId,
  }
}

export async function signInToDrive(): Promise<{ ok: true }> {
  const config = getDriveConfig()
  if (!config.clientId) {
    throw new Error(
      'Google Drive bağlantısı yapılandırılmamış. electron/config/gcp-oauth.keys.json dosyasına OAuth kimliği ekleyin.',
    )
  }

  const port = await getFreePort()
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`
  const { verifier, challenge } = createPkce()

  const authUrl = new URL(AUTH_URL)
  authUrl.searchParams.set('client_id', config.clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', DRIVE_SCOPE)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'select_account consent')
  authUrl.searchParams.set('hl', 'tr')
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let authWin: BrowserWindow | null = null

    const finish = (err: Error | null, code: string | null) => {
      if (settled) return
      settled = true
      if (authWin && !authWin.isDestroyed()) authWin.close()
      server.close()
      if (err) {
        reject(err)
        return
      }
      if (!code) {
        reject(new Error('OAuth kodu alınamadı'))
        return
      }
      void exchangeAuthCode(code, config.clientId, redirectUri, verifier)
        .then((tokens) => {
          const prev = loadTokens()
          if (!tokens.refresh_token && prev?.refresh_token) {
            tokens.refresh_token = prev.refresh_token
          }
          saveTokens(tokens)
          resolve()
        })
        .catch(reject)
    }

    const tryHandleCallbackUrl = (rawUrl: string) => {
      if (!rawUrl.startsWith(redirectUri)) return
      const url = new URL(rawUrl)
      const code = url.searchParams.get('code')
      const oauthErr = url.searchParams.get('error')
      if (oauthErr) {
        finish(new Error(oauthErr === 'access_denied' ? 'Giriş iptal edildi' : oauthErr), null)
        return
      }
      if (code) finish(null, code)
    }

    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/oauth2callback')) {
        res.statusCode = 404
        res.end()
        return
      }
      const url = new URL(req.url, redirectUri)
      const code = url.searchParams.get('code')
      const err = url.searchParams.get('error')
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      if (err) {
        res.end('<h2>Giriş iptal edildi.</h2><p>Bu pencereyi kapatabilirsiniz.</p>')
        finish(new Error(err === 'access_denied' ? 'Giriş iptal edildi' : err), null)
        return
      }
      if (!code) {
        res.end('<h2>Giriş başarısız.</h2><p>Bu pencereyi kapatabilirsiniz.</p>')
        finish(new Error('OAuth kodu alınamadı'), null)
        return
      }
      res.end(
        '<h2>Giriş başarılı!</h2><p>EDUTEST\'e dönebilirsiniz. Bu pencereyi kapatabilirsiniz.</p>',
      )
      finish(null, code)
    })

    server.on('error', (e) => finish(e instanceof Error ? e : new Error(String(e)), null))

    server.listen(port, '127.0.0.1', () => {
      const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? undefined
      authWin = new BrowserWindow({
        parent,
        modal: Boolean(parent),
        width: 500,
        height: 720,
        minWidth: 420,
        minHeight: 560,
        show: false,
        autoHideMenuBar: true,
        title: 'Google ile oturum açın',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      })

      authWin.webContents.setWindowOpenHandler(({ url }) => {
        void authWin?.loadURL(url)
        return { action: 'deny' }
      })

      authWin.webContents.on('will-redirect', (_event, url) => {
        tryHandleCallbackUrl(url)
      })
      authWin.webContents.on('did-navigate', (_event, url) => {
        tryHandleCallbackUrl(url)
      })

      authWin.once('ready-to-show', () => {
        authWin?.show()
        authWin?.focus()
      })

      authWin.on('closed', () => {
        if (!settled) finish(new Error('Giriş penceresi kapatıldı'), null)
      })

      void authWin.loadURL(authUrl.toString())
    })
  })

  return { ok: true }
}

export function signOutFromDrive() {
  if (fs.existsSync(tokenPath())) fs.unlinkSync(tokenPath())
}

export async function listDrivePdfFiles(query?: string): Promise<DrivePdfFile[]> {
  const token = await getValidAccessToken()
  const qParts = ["mimeType='application/pdf'", 'trashed=false']
  const trimmed = query?.trim()
  if (trimmed) {
    const safe = trimmed.replace(/'/g, "\\'")
    qParts.push(`name contains '${safe}'`)
  }
  const params = new URLSearchParams({
    q: qParts.join(' and '),
    fields: 'files(id,name,modifiedTime,size)',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
  })
  const res = await fetch(`${DRIVE_FILES_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = (await res.json()) as { files?: DrivePdfFile[]; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(json.error?.message ?? 'Drive dosyaları listelenemedi')
  }
  return json.files ?? []
}

export async function downloadDrivePdf(fileId: string): Promise<{ name: string; data: string }> {
  const token = await getValidAccessToken()
  const metaRes = await fetch(`${DRIVE_FILES_URL}/${fileId}?fields=name`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = (await metaRes.json()) as { name?: string; error?: { message?: string } }
  if (!metaRes.ok) {
    throw new Error(meta.error?.message ?? 'Dosya bilgisi alınamadı')
  }

  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? 'PDF indirilemedi')
  }
  const buf = Buffer.from(await res.arrayBuffer())
  return {
    name: meta.name?.trim() || 'drive-document.pdf',
    data: buf.toString('base64'),
  }
}
