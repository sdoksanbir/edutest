import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

let storageRoot = ''

export function initStoragePaths(root?: string) {
  storageRoot = root ?? path.join(app.getPath('userData'), 'storage')
  ensureStorageDirs()
}

export function getStorageRoot() {
  return storageRoot
}

export const uploadsDir = () => path.join(storageRoot, 'uploads')
export const draftsDir = () => path.join(storageRoot, 'drafts')
export const exportsDir = () => path.join(storageRoot, 'exports')
export const imagesDir = () => path.join(storageRoot, 'images')

export function ensureStorageDirs() {
  for (const dir of [uploadsDir(), draftsDir(), exportsDir(), imagesDir()]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
