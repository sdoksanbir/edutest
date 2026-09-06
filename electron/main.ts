import fs from 'node:fs'
import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerIpcHandlers } from './ipc-handlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

// Vite HMR `unsafe-eval` ister; paketlemede bu uyarı zaten çıkmaz.
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

function loadDotEnv() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
  ]
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue
    try {
      for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        if (process.env[key]) continue
        let val = trimmed.slice(eq + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        process.env[key] = val
      }
    } catch {
      /* ignore */
    }
    break
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

let allowQuit = false

function createWindow() {
  const { workArea, workAreaSize } = screen.getPrimaryDisplay()
  const minWidth = Math.min(1024, workAreaSize.width)
  const minHeight = Math.min(600, workAreaSize.height)

  const mainWindow = new BrowserWindow({
    title: 'TestQube Editor',
    width: workAreaSize.width,
    height: workAreaSize.height,
    x: workArea.x,
    y: workArea.y,
    minWidth,
    minHeight,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    loadDotEnv()
    Menu.setApplicationMenu(null)

    const storageDir = path.join(app.getPath('userData'), 'storage')
    registerIpcHandlers(storageDir)

    ipcMain.handle('save-pdf-dialog', async (_event, defaultName: string) => {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      return result.canceled ? null : result.filePath
    })

    ipcMain.handle('save-pdf-file', async (_event, filePath: string, base64: string) => {
      const fs = await import('node:fs')
      try {
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
        return { ok: true }
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code
        if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
          throw new Error('FILE_LOCKED')
        }
        throw err
      }
    })

    ipcMain.handle('save-et-dialog', async (_event, defaultName: string) => {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName.endsWith('.et') ? defaultName : `${defaultName}.et`,
        filters: [{ name: 'EDUTEST Taslak', extensions: ['et'] }],
      })
      return result.canceled ? null : result.filePath
    })

    ipcMain.handle('save-et-file', async (_event, filePath: string, utf8: string) => {
      const fs = await import('node:fs')
      const target = filePath.toLowerCase().endsWith('.et') ? filePath : `${filePath}.et`
      fs.writeFileSync(target, utf8, 'utf8')
      return { ok: true, filePath: target }
    })

    ipcMain.handle('open-et-dialog', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'EDUTEST Taslak', extensions: ['et'] }],
      })
      if (result.canceled || !result.filePaths[0]) return null
      const fs = await import('node:fs')
      const filePath = result.filePaths[0]!
      const content = fs.readFileSync(filePath, 'utf8')
      return { filePath, content }
    })

    ipcMain.handle('confirm-close', (_event, allow: boolean) => {
      allowQuit = allow
      if (allow) app.quit()
    })

    ipcMain.handle('ping', () => 'pong')

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('before-quit', (event) => {
  if (allowQuit) return
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    event.preventDefault()
    win.webContents.send('before-close-request')
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
