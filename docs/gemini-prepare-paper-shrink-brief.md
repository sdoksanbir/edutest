# EDUTEST — Kağıdı Hazırla görsel küçülme (Gemini brief)

## Problem
Kırpma kalitesi iyi. "Kağıdı Hazırla" → PDF önizlemede bazı soru görselleri çok küçük.
Bazıları normal, bazıları küçük.

## Soru
Başlangıçta yazı boyutu mu ayarlanıyor? Yoksa görseller önce küçültülüp sonra mı ayarlanıyor?
Doğru kök neden ve çözüm öner.

## Cevap (koddan)
- Açılışta OCR / yazı eşitleme **ÇALIŞMIYOR**.
- Akış: `PreparePaperButton` → `PdfPreviewModal.isOpen` → `fetchLayout` → Electron `exports:layout`
  → `layout-engine.prepareQuestionBlocks` → `CanvasPdfPreview` `drawImage`.
- Küçültme: `fitDrawSize(..., nativeW, availW)` içinde `w > availW` ⇒ `w = availW`.
- Varsayılan `columns = 2` (`editorStore`). Geniş kırpma sütuna sığmaz → küçülür.
- Eski `TEXT_SCALE (10/12)` yakın zamanda kaldırıldı; `nativeW = size.w / LAYOUT_ZOOM` (`LAYOUT_ZOOM = 600/72`).

## Kritik kod

### PreparePaperButton (sadece modal açar)
`src/components/forms/PreparePaperButton.tsx` — `setShowPreview(true)`

### Modal açılış (eşitleme YOK, sadece fetchLayout)
`src/components/modals/PdfPreviewModal.tsx` (~2640–2676):
- `originalQuestionScaleRef` snapshot
- `fetchLayout(gap)` — `applyQuestionLineHeightMatch` çağrılmaz

### Boyut hesabı (küçültme burada)
`electron/services/layout-engine.ts` → `prepareQuestionBlocks`:
- `LAYOUT_ZOOM = 600/72`
- `nativeW = size.w / LAYOUT_ZOOM`
- `displayScale = q.display_scale ?? 1`
- `ocr_font_matched` ise: `draw = f(TARGET_LINE_PT=8, font_line_px)`
- değilse: `draw = native * displayScale`
- `fitDrawSize`: önce `nativeW` tavanı, sonra `availW` tavanı
- `availW = colW - maxNumTextWPt - numGap - pad - numOffset`

### fitDrawSize
```ts
if (w > nativeW) w = nativeW
if (w > availW) w = availW  // ← sütun sığdırma (asıl küçültme)
```

### Varsayılanlar
- `editorStore`: `columns: 2`
- Crop ekleme: `display_scale` artık hep `1` (eski dar=`0.88` kaldırıldı)
- `ocr_font_matched` başlangıçta `false` (eşitleme butonuna basılmadıysa)

### Önizleme ölçeği
`CanvasPdfPreview`: `scale = PT_TO_PX * zoom` (~96 DPI ekran)
Sayfa A4; crop workspace zoom’undan farklı — görsel “küçük” hissi.

## Olası çözümler (değerlendir)
A) Geniş soruları sütuna sığdırırken küçültme yerine taşır / 1 sütuna al  
B) Açılışta “sütun genişliğine göre scale” yerine native bırak, taşanı kırp/uyarı  
C) Varsayılan `columns=1`  
D) `availW` clamp’i gevşet / max shrink oranı koy  
E) UI: “Orijinal boyut / Sütuna sığdır” seçeneği  
F) Yazı eşitlemeyi açılışta otomatik **ÇALIŞTIRMA** (şimdiki doğru; otomatik yapma)

## İstenmeyen
- Tüm crop pipeline’ı silip yeniden yazma
- Kaliteyi düşüren yeniden encode
- Açılışta otomatik OCR eşitleme (yanlış teşhis)

## Dosyalar
- `src/components/forms/PreparePaperButton.tsx`
- `src/components/modals/PdfPreviewModal.tsx` (`isOpen` effect, `fetchLayout`)
- `electron/services/layout-engine.ts` (`prepareQuestionBlocks`, `fitDrawSize`)
- `src/store/editorStore.ts` (`columns: 2`)
- `src/components/pdf/CanvasPdfPreview.tsx` (`drawImage`)
- `src/utils/normalizeQuestionFont.ts` (sadece manuel eşitleme)

## İlgili formül özeti
```
CROP_EXPORT_DPI = 600
LAYOUT_ZOOM = 600/72 ≈ 8.333
nativeW_pt = imageWidthPx / LAYOUT_ZOOM
A4 content ≈ 190 mm ≈ 538 pt (1 sütun)
2 sütun colW ≈ yarısı → geniş kırpma availW’ye zorlanır
```
