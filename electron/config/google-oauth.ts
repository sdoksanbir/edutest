import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Google Cloud Console > OAuth > Masaüstü uygulaması indirilen JSON buraya kopyalanır. */
const BUNDLED_CREDENTIALS = path.join(__dirname, 'gcp-oauth.keys.json')

function readClientIdFromJson(filePath: string): string {
  if (!fs.existsSync(filePath)) return ''
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>
    if (typeof json.clientId === 'string' && json.clientId.trim()) return json.clientId.trim()
    if (typeof json.client_id === 'string' && json.client_id.trim()) return json.client_id.trim()
    for (const key of ['installed', 'web', 'desktop'] as const) {
      const section = json[key]
      if (section && typeof section === 'object' && section !== null) {
        const id = (section as { client_id?: string }).client_id
        if (typeof id === 'string' && id.trim()) return id.trim()
      }
    }
  } catch {
    /* ignore */
  }
  return ''
}

function candidateCredentialPaths(storageRoot: string): string[] {
  const appData = process.env.APPDATA ?? ''
  const localAppData = process.env.LOCALAPPDATA ?? ''
  const userProfile = process.env.USERPROFILE ?? process.env.HOME ?? ''
  return [
    path.join(storageRoot, 'gcp-oauth.keys.json'),
    BUNDLED_CREDENTIALS,
    path.join(appData, 'Test Studio', 'gcp-oauth.keys.json'),
    path.join(appData, 'TestStudio', 'gcp-oauth.keys.json'),
    path.join(localAppData, 'Test Studio', 'gcp-oauth.keys.json'),
    path.join(localAppData, 'TestStudio', 'gcp-oauth.keys.json'),
    path.join(userProfile, '.config', 'teststudio', 'gcp-oauth.keys.json'),
    path.join(userProfile, '.config', 'google-drive-mcp', 'gcp-oauth.keys.json'),
  ]
}

export function resolveGoogleClientId(storageRoot: string, savedClientId?: string): string {
  const fromEnv = process.env.GOOGLE_CLIENT_ID?.trim()
  if (fromEnv) return fromEnv

  if (savedClientId?.trim()) return savedClientId.trim()

  for (const file of candidateCredentialPaths(storageRoot)) {
    const id = readClientIdFromJson(file)
    if (id) return id
  }

  return ''
}

export function importGoogleCredentials(
  storageRoot: string,
  sourcePath: string,
): { ok: true; clientId: string } | { ok: false; error: string } {
  const clientId = readClientIdFromJson(sourcePath)
  if (!clientId) {
    return {
      ok: false,
      error:
        'Seçilen dosyada geçerli bir client_id bulunamadı. Google Cloud Console\'dan indirdiğiniz OAuth JSON dosyasını seçin.',
    }
  }
  try {
    const dest = path.join(storageRoot, 'gcp-oauth.keys.json')
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(sourcePath, dest)
    return { ok: true, clientId }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Kimlik dosyası kaydedilemedi',
    }
  }
}
