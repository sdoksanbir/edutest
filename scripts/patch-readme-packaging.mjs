import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const readmePath = path.join(root, 'README.md')
let readme = fs.readFileSync(readmePath, 'utf8')

if (!readme.includes('## Paketleme (Windows / macOS)')) {
  const section = `
## Paketleme (Windows / macOS)

\`electron-builder\` ile kurulum dosyası üretir. Çıktılar \`release/\` klasörüne yazılır.

| Komut | Ne üretir | Nerede çalıştırılır |
|-------|-----------|---------------------|
| \`npm run dist:win\` | Windows NSIS kurulumcu + portable \`.exe\` | **Windows** |
| \`npm run dist:mac\` | macOS \`.dmg\` + \`.zip\` (x64 + arm64) | **macOS** |
| \`npm run dist\` | Bulunduğun işletim sistemi için paket | Win veya Mac |
| \`npm run dist:dir\` | Paketlenmemiş klasör (hızlı test) | Win veya Mac |

### Windows

\`\`\`powershell
npm run dist:win
\`\`\`

Örnek çıktılar \`release/\` altında (sürüm numarası \`package.json\` ile değişir):
- NSIS kurulumcu \`.exe\`
- Portable \`.exe\`

### macOS

\`\`\`bash
npm run dist:mac
\`\`\`

> macOS \`.dmg\` / \`.app\` yalnızca Mac üzerinde üretilir. Windows makinede \`dist:mac\` çalışmaz.
> Gatekeeper için Apple Developer imzalama ve notarize ayrıca gerekir.

### İkon (isteğe bağlı)

\`build/\` altına koyun:
- \`icon.ico\` — Windows
- \`icon.icns\` — macOS
- \`icon.png\` — 512×512 yedek

`
  const marker = '## Lisans / durum'
  if (!readme.includes(marker)) {
    throw new Error('README marker not found: ' + marker)
  }
  readme = readme.replace(marker, section + marker)
}

const previewRow = '| `npm run preview` | Sadece Vite preview (Electron yok) |'
const distRows = `${previewRow}
| \`npm run dist:win\` | Windows \`.exe\` (NSIS + portable) → \`release/\` |
| \`npm run dist:mac\` | macOS \`.dmg\` / \`.zip\` → \`release/\` (yalnızca Mac) |
| \`npm run dist\` | Mevcut OS için paket |
| \`npm run dist:dir\` | Paketlenmemiş uygulama klasörü (test) |`

if (readme.includes(previewRow) && !readme.includes('| `npm run dist:win` | Windows `.exe`')) {
  readme = readme.replace(previewRow, distRows)
}

fs.writeFileSync(readmePath, readme, 'utf8')
console.log('README packaging section OK')
