/** Yazılı PDF başlık alanı — backend `written_paper_field_lines` anahtarları ile aynı */
export const WRITTEN_HEADER_FIELD_KEYS = [
  "ad_soyad",
  "numara",
  "puan",
  "sinif",
  "grup",
] as const;

export type WrittenHeaderFieldKey = (typeof WRITTEN_HEADER_FIELD_KEYS)[number];

/** Başlık modalı: grup kitapçık harfi için formda; PDF üstünde ayrı sütun yok */
export const WRITTEN_HEADER_MODAL_FIELD_KEYS: readonly WrittenHeaderFieldKey[] = [
  "ad_soyad",
  "numara",
  "puan",
  "sinif",
];

export type WrittenHeaderFieldLines = Record<WrittenHeaderFieldKey, string[]>;

export type WrittenHeaderFieldHidden = Record<WrittenHeaderFieldKey, boolean>;

/** Boş = varsayılan WRITTEN_HEADER_FIELD_LABELS[key] kullanılır */
export type WrittenHeaderFieldLabels = Record<WrittenHeaderFieldKey, string>;

export const WRITTEN_HEADER_FIELD_LABELS: Record<WrittenHeaderFieldKey, string> = {
  ad_soyad: "ADI SOYADI",
  numara: "NUMARA",
  puan: "PUAN",
  sinif: "SINIF",
  grup: "GRUP",
};

/** PDF `_split_written_title_semantic` ile aynı (DERSİ kırılımı). */
export function splitWrittenTitleSemantic(title: string): [string, string] {
  const t = (title || "").trim().slice(0, 250);
  if (!t) return ["YAZILI SINAV", ""];
  if (t.includes(" DERSİ ")) {
    const idx = t.indexOf(" DERSİ ");
    return [t.slice(0, idx + 7).trim(), t.slice(idx + 7).trim()];
  }
  const idx = t.indexOf("DERSİ");
  if (idx !== -1) {
    return [t.slice(0, idx + 5).trim(), t.slice(idx + 5).trim()];
  }
  return [t, ""];
}

/** Kelime sarmalama — `measure` piksel veya pt genişliği döndürür. */
export function wrapTitleLinesWithMeasure(
  title: string,
  measure: (s: string) => number,
  maxWidth: number
): string[] {
  const parts: string[] = [];
  const [a, b] = splitWrittenTitleSemantic(title);
  if (a.trim()) parts.push(a.trim());
  if (b.trim()) parts.push(b.trim());
  const out: string[] = [];
  for (const part of parts) {
    const words = part.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (measure(test) <= maxWidth) cur = test;
      else {
        if (cur) out.push(cur);
        cur = measure(w) <= maxWidth ? w : w.slice(0, Math.max(1, Math.floor(maxWidth / 5)));
      }
    }
    if (cur) out.push(cur);
  }
  return (out.length ? out : ["YAZILI SINAV"]).slice(0, 8);
}

const _AVG_CHAR_PT = 5.1;

/** Layout yüksekliği için kablo genişliğinde yaklaşık sarma (ctx yok). */
export function writtenTitleLinesPt(title: string, maxWidthPt: number): string[] {
  return wrapTitleLinesWithMeasure(
    title,
    (s) => s.length * _AVG_CHAR_PT,
    Math.max(80, maxWidthPt)
  );
}

/** Sarmalanmış satır sayısı × 11 pt. */
export function writtenTitleBlockHeightPt(title: string, maxWidthPt: number = 320): number {
  return writtenTitleLinesPt(title, maxWidthPt).length * 11;
}

export function emptyWrittenHeaderFieldLines(): WrittenHeaderFieldLines {
  return {
    ad_soyad: [],
    numara: [],
    puan: [],
    sinif: [],
    grup: [],
  };
}

export function emptyWrittenHeaderFieldHidden(): WrittenHeaderFieldHidden {
  return {
    ad_soyad: false,
    numara: false,
    puan: false,
    sinif: false,
    grup: false,
  };
}

export function emptyWrittenHeaderFieldLabels(): WrittenHeaderFieldLabels {
  return {
    ad_soyad: "",
    numara: "",
    puan: "",
    sinif: "",
    grup: "",
  };
}

export function resolveWrittenHeaderLabel(
  key: WrittenHeaderFieldKey,
  labels: WrittenHeaderFieldLabels
): string {
  const c = (labels[key] ?? "").trim();
  return c || WRITTEN_HEADER_FIELD_LABELS[key];
}

/** PDF sol blok: etiket + ':' (kullanıcı zaten ':' ile bitirdiyse ekleme) */
export function writtenHeaderLabelPdfLeft(
  key: "ad_soyad" | "numara" | "sinif",
  labels: WrittenHeaderFieldLabels
): string {
  const base = resolveWrittenHeaderLabel(key, labels);
  return base.endsWith(":") ? base : `${base}:`;
}

export function writtenHeaderLabelPdfPuan(labels: WrittenHeaderFieldLabels): string {
  return resolveWrittenHeaderLabel("puan", labels);
}

function _visibleRowCount(len: number, hidden: boolean): number {
  if (hidden) return 0;
  if (len === 0) return 1;
  return Math.min(10, Math.max(1, len));
}

const MM_TO_PT = 72 / 25.4;
const _WRITTEN_TITLE_TO_FIELDS_GAP_PT = 17;
const _WRITTEN_SINIF_TO_RULE_GAP_PT = 2 * MM_TO_PT;
const _WRITTEN_RULE_TO_CONTENT_GAP_PT = 2 * MM_TO_PT;
const _WRITTEN_DIVIDER_LINE_PT = 0.9;
const _WRITTEN_ROW_AFTER_ADI_PT = 8;
const _WRITTEN_LINE_ROW_PT = 11;
const _WRITTEN_PUAN_BOX_H_PT = 40;

/** PDF / önizleme: sol blok gövde yüksekliği (pt) ve block_low */
export function writtenHeaderBlockLayoutPt(
  fieldLines: WrittenHeaderFieldLines,
  hidden: WrittenHeaderFieldHidden
): { blockBody: number; blockLow: number; nAd: number; nNum: number; nSin: number } {
  const nAd = _visibleRowCount(fieldLines.ad_soyad.length, hidden.ad_soyad);
  const nNum = _visibleRowCount(fieldLines.numara.length, hidden.numara);
  const nSin = _visibleRowCount(fieldLines.sinif.length, hidden.sinif);
  const gap = _WRITTEN_ROW_AFTER_ADI_PT;
  const lh = _WRITTEN_LINE_ROW_PT;
  let blockBody = 0;
  if (nAd) {
    blockBody += nAd * lh;
    if (nNum || nSin) blockBody += gap;
  }
  if (nNum) {
    blockBody += nNum * lh;
    if (nSin) blockBody += gap;
  }
  if (nSin) blockBody += nSin * lh;
  const blockLow = hidden.puan
    ? Math.max(blockBody, blockBody / 2)
    : Math.max(blockBody, blockBody / 2 + _WRITTEN_PUAN_BOX_H_PT / 2);
  return { blockBody, blockLow, nAd, nNum, nSin };
}

/** Canvas / layout: backend `written_paper_header_total_height_pt` ile uyumlu */
export function approxWrittenHeaderHeightPt(
  fieldLines: WrittenHeaderFieldLines,
  writtenTitle?: string,
  titleMaxWidthPt: number = 320,
  hidden: WrittenHeaderFieldHidden = emptyWrittenHeaderFieldHidden()
): number {
  const titleH = writtenTitleBlockHeightPt(writtenTitle ?? "", titleMaxWidthPt);
  const { blockLow } = writtenHeaderBlockLayoutPt(fieldLines, hidden);
  return (
    titleH +
    _WRITTEN_TITLE_TO_FIELDS_GAP_PT +
    blockLow +
    _WRITTEN_SINIF_TO_RULE_GAP_PT +
    _WRITTEN_DIVIDER_LINE_PT +
    _WRITTEN_RULE_TO_CONTENT_GAP_PT
  );
}

/** Üst iç kenardan yatay çizgi merkezine (pt) — backend `written_paper_rule_down_from_inner_top_pt` */
export function approxWrittenRuleDownFromInnerTopPt(
  fieldLines: WrittenHeaderFieldLines,
  writtenTitle?: string,
  titleMaxWidthPt: number = 320,
  hidden: WrittenHeaderFieldHidden = emptyWrittenHeaderFieldHidden()
): number {
  const titleH = writtenTitleBlockHeightPt(writtenTitle ?? "", titleMaxWidthPt);
  const { blockLow } = writtenHeaderBlockLayoutPt(fieldLines, hidden);
  return (
    titleH +
    _WRITTEN_TITLE_TO_FIELDS_GAP_PT +
    blockLow +
    _WRITTEN_SINIF_TO_RULE_GAP_PT +
    _WRITTEN_DIVIDER_LINE_PT / 2
  );
}
