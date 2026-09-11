/**
 * Sayfalar arası paylaşılan HTMLImageElement önbelleği.
 * 100+ soruda her CanvasPdfPreview’ın aynı PNG’yi yeniden decode etmesini önler.
 */

const cache = new Map<string, HTMLImageElement>();
const inflight = new Map<string, Promise<HTMLImageElement | null>>();

function toDataUrl(b64OrUrl: string): string {
  if (!b64OrUrl) return "";
  if (b64OrUrl.startsWith("data:") || b64OrUrl.startsWith("blob:")) return b64OrUrl;
  return `data:image/png;base64,${b64OrUrl}`;
}

export function getCachedQuestionImage(id: string): HTMLImageElement | undefined {
  const img = cache.get(id);
  return img?.complete ? img : undefined;
}

export function loadQuestionImageFromData(
  id: string,
  b64OrUrl: string,
): Promise<HTMLImageElement | null> {
  const existing = getCachedQuestionImage(id);
  if (existing) return Promise.resolve(existing);
  const pending = inflight.get(id);
  if (pending) return pending;

  const src = toDataUrl(b64OrUrl);
  if (!src) return Promise.resolve(null);

  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(id, img);
      inflight.delete(id);
      resolve(img);
    };
    img.onerror = () => {
      inflight.delete(id);
      resolve(null);
    };
    img.src = src;
  });
  inflight.set(id, p);
  return p;
}

/** Görünür sayfa dışındaki id’leri bellekten düş (isteğe bağlı). */
export function retainQuestionImages(keepIds: Iterable<string>): void {
  const keep = new Set(keepIds);
  for (const id of cache.keys()) {
    if (!keep.has(id)) cache.delete(id);
  }
}
