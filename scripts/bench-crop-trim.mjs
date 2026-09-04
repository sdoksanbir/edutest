/**
 * Kırpma "Ekle" akışı — piksel iş yükü karşılaştırması (trimCropToContent).
 * Gerçek tarayıcı canvas'ından bağımsız; algoritma karmaşıklığını ölçer.
 *
 * Çalıştır: node scripts/bench-crop-trim.mjs
 */

const PAGE_W = 2550; // A4 @ 300 DPI
const PAGE_H = 3300;
const CROP_W = 620;
const CROP_H = 420;

function bench(label, pixelOps) {
  const t0 = performance.now();
  let acc = 0;
  const iterations = 80;
  for (let n = 0; n < iterations; n++) {
    acc += pixelOps();
  }
  const ms = performance.now() - t0;
  console.log(`${label}: ${ms.toFixed(1)}ms (${iterations} iter), acc=${acc % 997}`);
}

function oldTrimPixels() {
  // Eski: tüm sayfayı çiz + crop bölgesini oku
  let sum = 0;
  for (let i = 0; i < PAGE_W * PAGE_H; i++) sum += i & 1;
  for (let py = 0; py < CROP_H; py++) {
    for (let px = 0; px < CROP_W; px++) {
      const avg = ((px * 3 + py * 5) % 256);
      if (avg < 200) sum += px + py;
    }
  }
  return sum;
}

function newTrimPixels() {
  // Yeni: yalnızca crop bölgesini işle
  let sum = 0;
  for (let py = 0; py < CROP_H; py++) {
    for (let px = 0; px < CROP_W; px++) {
      const avg = ((px * 3 + py * 5) % 256);
      if (avg < 200) sum += px + py;
    }
  }
  return sum;
}

const oldPixels = PAGE_W * PAGE_H + CROP_W * CROP_H;
const newPixels = CROP_W * CROP_H;
const ratio = (oldPixels / newPixels).toFixed(1);

console.log("--- Crop trim performans modeli ---");
console.log(`Sayfa: ${PAGE_W}x${PAGE_H}, seçim: ${CROP_W}x${CROP_H}`);
console.log(`Eski piksel dokunuşu: ${oldPixels.toLocaleString()}`);
console.log(`Yeni piksel dokunuşu: ${newPixels.toLocaleString()} (~${ratio}x daha az)\n`);

bench("Eski algoritma (tam sayfa canvas)", oldTrimPixels);
bench("Yeni algoritma (yalnızca seçim)", newTrimPixels);

console.log("\nNot: editöre eklemede ayrı düşük-DPI yeniden render yok;");
console.log("kırpma CROP_EXPORT_DPI=600 sayfa önbelleğinden kesilir.");
