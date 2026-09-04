/**
 * Modül düzeyinde cache: Local PDF'ler ve bekleyen seçimler rotalar arası kaybolmaz.
 * Sayfa yenilenene veya pencere kapanana kadar kalır.
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

export type LocalPdfEntry = {
  id: string;
  doc: PDFDocumentProxy;
  pageCount: number;
  filename: string;
};

export type LocalImageEntry = {
  id: string;
  dataUrl: string;
  pageCount: 1;
  filename: string;
};

export type StoredPendingSelection = {
  id: string;
  pdf_id: string;
  page_number: number;
  crop: { x: number; y: number; width: number; height: number };
  answer_key?: string;
  number: number;
  remove_background?: boolean;
  backendId?: string;
  isLocal?: boolean;
  localPdfId?: string;
  localFilename?: string;
};

const pdfStore = new Map<string, LocalPdfEntry>();
const imageStore = new Map<string, LocalImageEntry>();
let _pendingSelections: StoredPendingSelection[] = [];
/** Son seçilen kaynak (server:id veya local:id) - rota değişiminde korunur */
let _lastSelectedSource: string | null = null;
/** Kaynak başına son sayfa - rota değişiminde korunur */
const _pageIndices = new Map<string, number>();
/** Kaynak başına zoom yüzdesi - her PDF kendi zoom ayarını kullanır */
const _zoomBySource = new Map<string, number>();
/** Soruların şık sayısı: 3, 4 veya 5 - kırpma aracı ilk açıldığında sorulur, null = henüz seçilmedi */
let _choiceCount: 3 | 4 | 5 | null = null;
/** Kaydedilmiş local soruların kaynak eşlemesi - tıklanınca sayfaya gidilebilsin */
const _questionIdToLocalSource = new Map<string, { localPdfId: string; pageNumber: number }>();

export function setLocalSourceForQuestion(questionId: string, localPdfId: string, pageNumber: number): void {
  _questionIdToLocalSource.set(questionId, { localPdfId, pageNumber });
}

export function getLocalSourceForQuestion(questionId: string): { localPdfId: string; pageNumber: number } | undefined {
  return _questionIdToLocalSource.get(questionId);
}

export function addLocalPdfs(entries: LocalPdfEntry[]): void {
  for (const e of entries) {
    pdfStore.set(e.id, e);
  }
}

export function addLocalImages(entries: LocalImageEntry[]): void {
  for (const e of entries) {
    imageStore.set(e.id, e);
  }
}

export function getLocalPdf(id: string): LocalPdfEntry | undefined {
  return pdfStore.get(id);
}

export function getLocalImage(id: string): LocalImageEntry | undefined {
  return imageStore.get(id);
}

/** PDF veya resim - local kaynak id'sine göre */
export function getLocalSource(id: string): LocalPdfEntry | LocalImageEntry | undefined {
  return pdfStore.get(id) ?? imageStore.get(id);
}

export function listLocalPdfs(): LocalPdfEntry[] {
  return Array.from(pdfStore.values());
}

export function listLocalImages(): LocalImageEntry[] {
  return Array.from(imageStore.values());
}

export function listLocalSources(): (LocalPdfEntry | LocalImageEntry)[] {
  return [...listLocalPdfs(), ...listLocalImages()];
}

export function removeLocalPdf(id: string): void {
  pdfStore.delete(id);
  _removeLocalSource(id);
}

export function removeLocalImage(id: string): void {
  imageStore.delete(id);
  _removeLocalSource(id);
}

function _removeLocalSource(id: string): void {
  _pendingSelections = _pendingSelections.filter((s) => s.localPdfId !== id);
  for (const [qId, src] of _questionIdToLocalSource) {
    if (src.localPdfId === id) _questionIdToLocalSource.delete(qId);
  }
  if (_lastSelectedSource?.startsWith("local:") && _lastSelectedSource === `local:${id}`) {
    _lastSelectedSource = null;
  }
  _pageIndices.delete(`local:${id}`);
  _zoomBySource.delete(`local:${id}`);
}

export function setLastSelectedSource(value: string | null): void {
  _lastSelectedSource = value;
}

export function getLastSelectedSource(): string | null {
  return _lastSelectedSource;
}

export function getStoredPendingSelections(): StoredPendingSelection[] {
  return [..._pendingSelections];
}

/**
 * Sadece mevcut PDF'lere ait seçimleri döndür. Eski/silinmiş PDF'lere ait orphan seçimleri hariç tutar.
 */
export function getStoredPendingSelectionsForValidDocuments(serverIds: string[]): StoredPendingSelection[] {
  return _pendingSelections.filter((s) => {
    if (s.backendId) return true;
    if (s.pdf_id) return serverIds.includes(s.pdf_id);
    if (s.localPdfId) return pdfStore.has(s.localPdfId) || imageStore.has(s.localPdfId);
    return false;
  });
}


export function setStoredPendingSelections(items: StoredPendingSelection[]): void {
  _pendingSelections = [...items];
}

export function getPageIndex(sourceKey: string): number | undefined {
  return _pageIndices.get(sourceKey);
}

export function setPageIndex(sourceKey: string, page: number): void {
  _pageIndices.set(sourceKey, page);
}

export function getAllPageIndices(): Record<string, number> {
  return Object.fromEntries(_pageIndices);
}

export function getZoomForSource(sourceKey: string): number | undefined {
  return _zoomBySource.get(sourceKey);
}

export function setZoomForSource(sourceKey: string, zoom: number): void {
  _zoomBySource.set(sourceKey, zoom);
}

export function getChoiceCount(): 3 | 4 | 5 | null {
  return _choiceCount;
}

export function setChoiceCount(count: 3 | 4 | 5): void {
  _choiceCount = count;
}
