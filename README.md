# EDUTEST

Electron + React (Vite) tabanlı sınav / test PDF hazırlama uygulaması.

PDF önizleme, başlık (banner) temaları, soru yerleşimi, kırpma ve Google Drive bağlantısı için masaüstü istemcisi.

## Gereksinimler

| Araç | Önerilen | Not |
|------|----------|-----|
| **Node.js** | **20 LTS** veya **22 LTS** | [nodejs.org](https://nodejs.org) |
| **npm** | Node ile gelir | `npm -v` ile kontrol edin |
| **Git** | Son sürüm | [git-scm.com](https://git-scm.com) |
| **macOS** | 13+ (Ventura) | Electron 44 için |
| **Windows** | 10 / 11 (64-bit) | |

> İlk kurulumda veya paketler bozulduğunda `node_modules` silinip yeniden yüklenmelidir (aşağıda).

## Projeyi klonlama

```bash
git clone https://github.com/sdoksanbir/edutest.git
cd edutest
```

GitHub deposu: [github.com/sdoksanbir/edutest](https://github.com/sdoksanbir/edutest)

## Bağımlılıkları yükleme

### Windows (PowerShell veya CMD)

```powershell
cd edutest
npm install
```

### macOS (Terminal)

```bash
cd edutest
npm install
```

İlk `npm install` Electron binary indirdiği için birkaç dakika sürebilir.

## Uygulamayı çalıştırma (geliştirme)

Vite + Electron birlikte açılır:

### Windows

```powershell
npm run dev
```

### macOS

```bash
npm run dev
```

Electron penceresi açılmazsa bir süre bekleyin; `tsc --watch` önce `dist-electron` derler.

## Diğer komutlar

| Komut | Ne yapar |
|-------|----------|
| `npm run dev` | Geliştirme (Vite + Electron, hot reload) |
| `npm run build` | Frontend production build (`dist/`) |
| `npm run build:electron` | Electron main/preload derlemesi (`dist-electron/`) |
| `npm start` | Build alıp Electron ile çalıştırır |
| `npm run lint` | Oxlint |
| `npm run preview` | Sadece Vite preview (Electron yok) |

## Paketleri yeniden yükleme (sorun olursa)

Bağımlılık hataları, bozuk `node_modules`, Electron açılmama veya `Cannot find module` durumunda:

### Windows (PowerShell)

```powershell
cd edutest
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```

### macOS / Linux

```bash
cd edutest
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run dev
```

Electron özel sorununda (native binary):

```bash
npx electron --version
npm rebuild
# veya
npm install electron --save-dev
```

## Klasör yapısı (önemli konumlar)

```
edutest/
├── electron/                 # Electron ana süreç (TypeScript kaynak)
│   ├── main.ts               # Uygulama girişi
│   ├── ipc-handlers.ts       # IPC
│   ├── config/               # OAuth vb. (gizli anahtarları commit etmeyin)
│   └── services/             # PDF export, banner çizimi, store
├── dist-electron/            # Derlenmiş Electron çıktısı (dev bunu kullanır)
├── src/                      # React arayüz
│   ├── components/
│   │   ├── preview/          # Düzenleme + Tema panelleri
│   │   ├── pdf/              # PDF canvas / önizleme
│   │   ├── exam-banner/      # Sınav banner şablonları
│   │   ├── test-banner/      # Test banner
│   │   └── leaf-test-banner/ # Yaprak test banner
│   ├── styles/               # pdfPreviewUi.css, tokens
│   ├── utils/                # Banner layout, header metrikleri
│   └── store/                # Zustand state
├── public/                   # Statik dosyalar / referans görseller
├── scripts/                  # Dev watch yardımcıları
├── package.json              # Scriptler ve bağımlılıklar
└── vite.config.ts
```

### UI panelleri

| Panel | Dosya |
|-------|--------|
| Düzenleme (sol) | `src/components/preview/PageStructurePanel.tsx` (+ modal içinde) |
| Tema ve başlık (sağ) | `src/components/preview/ThemeCustomizerSidebar.tsx` |
| Panel stilleri | `src/styles/pdfPreviewUi.css` |
| Tema tokenları | `src/styles/pdfPreviewUiTheme.ts` |

### Banner / PDF çizim

| Konu | Kaynak (`src/`) | Electron (`electron/services/`) |
|------|-----------------|----------------------------------|
| Kurumsal başlık (Tema 1) | `utils/drawCorporateHeaderCanvas.ts` | `corporate-header-draw.ts` |
| Sağ alan modu (Sınav / DYB / Test No) | `utils/bannerRightMode.ts` | `banner-right-mode.ts` |
| Header config | `utils/corporateHeaderLayout.ts` | `corporate-header-layout.ts` |

## Google OAuth (isteğe bağlı)

Drive özellikleri için:

```bash
cp electron/config/gcp-oauth.keys.json.example electron/config/gcp-oauth.keys.json
```

Dosyayı kendi Google Cloud client bilgilerinizle doldurun. **Gerçek anahtarları commit etmeyin** (`.gitignore` bu dosyayı dışlar).

## Güncel kodu çekme

```bash
cd edutest
git pull
npm install
npm run dev
```

`package.json` değiştiyse mutlaka `npm install` çalıştırın.

## Lisans / durum

Özel proje (`"private": true`). Depo erişimini GitHub’da Private tutmanız önerilir.
