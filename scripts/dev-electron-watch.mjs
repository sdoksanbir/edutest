import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import waitOn from 'wait-on'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const devServerUrl = 'http://127.0.0.1:5173'
const electronCli = path.join(rootDir, 'node_modules', 'electron', 'cli.js')
const distDir = path.join(rootDir, 'dist-electron')

/** tsc --watch ilk derleme + yeniden yazma fırtınasını yoksay. */
const WATCH_GRACE_MS = 6000
/** dist-electron sessiz kalınca ilk Electron açılır. */
const DIST_IDLE_MS = 1200
const DIST_IDLE_TIMEOUT_MS = 45000

let electronChild = null
let restartTimer = null
let ignoreWatchUntil = 0
let watchingEnabled = false

function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: rootDir,
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${label} exited with code ${code ?? 'null'}`))
    })
  })
}

function stopElectron() {
  if (!electronChild || electronChild.killed) return
  const pid = electronChild.pid
  if (process.platform === 'win32' && pid) {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true, stdio: 'ignore' })
  } else {
    electronChild.kill('SIGTERM')
  }
  electronChild = null
}

function startElectron() {
  stopElectron()
  electronChild = spawn(process.execPath, [electronCli, '.'], {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
      // Vite HMR için unsafe-eval gerekir; paketlemede bu uyarı çıkmaz.
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  })
  electronChild.on('exit', () => {
    electronChild = null
  })
  ignoreWatchUntil = Date.now() + WATCH_GRACE_MS
}

function scheduleElectronRestart() {
  if (!watchingEnabled) return
  // İlk derleme / Electron restart sonrası yazmalar grace süresini uzatsın
  if (Date.now() < ignoreWatchUntil) {
    ignoreWatchUntil = Date.now() + WATCH_GRACE_MS
    return
  }
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restartTimer = null
    console.log('[electron-watch] dist-electron güncellendi — Electron yeniden başlatılıyor…')
    startElectron()
  }, 350)
}

/** dist-electron .js yazımları DIST_IDLE_MS kadar durana kadar bekle. */
function waitForDistIdle(timeoutMs = DIST_IDLE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false
    let idleTimer = null
    let sawActivity = false

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(idleTimer)
      clearTimeout(hardTimeout)
      clearTimeout(noActivityFallback)
      try {
        watcher.close()
      } catch {
        /* ignore */
      }
      resolve()
    }

    const armIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(finish, DIST_IDLE_MS)
    }

    const hardTimeout = setTimeout(finish, timeoutMs)

    // tsc --watch bazen yeniden yazmaz; sonsuza kadar beklemeyelim
    const noActivityFallback = setTimeout(() => {
      if (!sawActivity) finish()
    }, 3500)

    let watcher
    try {
      watcher = fs.watch(distDir, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith('.js')) return
        sawActivity = true
        armIdle()
      })
    } catch {
      finish()
    }
  })
}

async function main() {
  console.log('[electron-watch] İlk Electron derlemesi…')
  await run('npm', ['run', 'build:electron'], 'build:electron')

  console.log('[electron-watch] Vite bekleniyor…')
  await waitOn({
    resources: ['http-get://127.0.0.1:5173'],
    timeout: 120000,
    interval: 500,
    validateStatus: (status) => status === 200,
  })

  const tscWatch = spawn('npx', ['tsc', '-p', 'electron/tsconfig.json', '--watch', '--preserveWatchOutput'], {
    stdio: 'inherit',
    cwd: rootDir,
    shell: true,
  })

  const preloadWatch = spawn(
    'npx',
    ['tsc', '-p', 'electron/tsconfig.preload.json', '--watch', '--preserveWatchOutput'],
    {
      stdio: 'inherit',
      cwd: rootDir,
      shell: true,
    },
  )

  console.log('[electron-watch] TypeScript watch ilk derlemesi bekleniyor…')
  await waitForDistIdle()

  fs.watch(distDir, { recursive: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.js')) return
    scheduleElectronRestart()
  })

  console.log('[electron-watch] Electron başlatılıyor…')
  startElectron()
  watchingEnabled = true

  const shutdown = (signal) => {
    stopElectron()
    tscWatch.kill()
    preloadWatch.kill()
    process.kill(process.pid, signal)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[electron-watch]', err)
  process.exit(1)
})
