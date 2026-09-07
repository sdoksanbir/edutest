/**
 * Tesseract worker/core/lang dosyalarını public/tesseract altına kopyalar.
 * CDN bağımlılığını kaldırır (Electron CSP script-src 'self').
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'public', 'tesseract')
const langDir = path.join(outDir, 'lang')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

function copyGlobFiles(srcDir, destDir, predicate) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Eksik paket dizini: ${srcDir}`)
  }
  ensureDir(destDir)
  for (const name of fs.readdirSync(srcDir)) {
    if (!predicate(name)) continue
    copyFile(path.join(srcDir, name), path.join(destDir, name))
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest))
    const file = fs.createWriteStream(dest)
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close()
          fs.unlinkSync(dest)
          downloadFile(res.headers.location, dest).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          file.close()
          fs.unlinkSync(dest)
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
      })
      .on('error', (err) => {
        file.close()
        try {
          fs.unlinkSync(dest)
        } catch {
          /* ignore */
        }
        reject(err)
      })
  })
}

async function ensureLang(lang) {
  const dest = path.join(langDir, `${lang}.traineddata.gz`)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return
  const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`
  console.log(`Downloading ${lang}.traineddata.gz ...`)
  await downloadFile(url, dest)
}

ensureDir(outDir)
ensureDir(langDir)

const workerSrc = path.join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')
if (!fs.existsSync(workerSrc)) {
  throw new Error('tesseract.js worker.min.js bulunamadı — npm install çalıştırın')
}
copyFile(workerSrc, path.join(outDir, 'worker.min.js'))

const coreDir = path.join(root, 'node_modules', 'tesseract.js-core')
copyGlobFiles(coreDir, outDir, (name) =>
  name.startsWith('tesseract-core') &&
  (name.endsWith('.js') || name.endsWith('.wasm')),
)

await ensureLang('eng')
await ensureLang('tur')

console.log(`Tesseract assets → ${outDir}`)
