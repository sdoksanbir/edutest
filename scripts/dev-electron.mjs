import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import waitOn from 'wait-on'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const devServerUrl = 'http://127.0.0.1:5173'
const electronCli = path.join(rootDir, 'node_modules', 'electron', 'cli.js')

await waitOn({
  resources: ['http-get://127.0.0.1:5173'],
  timeout: 120000,
  interval: 500,
  validateStatus: (status) => status === 200,
})

const child = spawn(process.execPath, [electronCli, '.'], {
  stdio: 'inherit',
  cwd: rootDir,
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devServerUrl,
  },
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
