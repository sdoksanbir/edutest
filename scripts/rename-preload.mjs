import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const from = path.join(rootDir, 'dist-electron', 'preload.js')
const to = path.join(rootDir, 'dist-electron', 'preload.cjs')

if (existsSync(from)) {
  renameSync(from, to)
}

const oauthSrc = path.join(rootDir, 'electron', 'config', 'gcp-oauth.keys.json')
const oauthDestDir = path.join(rootDir, 'dist-electron', 'config')
const oauthDest = path.join(oauthDestDir, 'gcp-oauth.keys.json')
if (existsSync(oauthSrc)) {
  mkdirSync(oauthDestDir, { recursive: true })
  copyFileSync(oauthSrc, oauthDest)
}