/**
 * pdf.js wasm / cmaps / standard_fonts -> public/pdfjs
 * JPEG2000 (OpenJPEG) decode icin wasmUrl sart.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pkg = path.join(root, 'node_modules', 'pdfjs-dist')
const outRoot = path.join(root, 'public', 'pdfjs')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Eksik pdfjs-dist dizini: ${src}`)
  }
  ensureDir(dest)
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name)
    const to = path.join(dest, name)
    const st = fs.statSync(from)
    if (st.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

for (const folder of ['wasm', 'cmaps', 'standard_fonts']) {
  copyDir(path.join(pkg, folder), path.join(outRoot, folder))
}

console.log('pdfjs assets ->', outRoot)