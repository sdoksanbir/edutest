import type { OptikChoice } from "./optikFormStats";
import type { OptikFormDrawRow } from "./optikFormLayout";
import type { OptikFormBookletType, OptikFormNetRule } from "./optikFormSettings";

export type OptikScanPayload = {
  v: 1;
  app: "edutest";
  id: string;
  title: string;
  n: number;
  options: OptikChoice[];
  /** Sıralı cevap anahtarı — A=0..E=4, ?=boş */
  key: string;
  net: OptikFormNetRule;
  booklet: OptikFormBookletType;
};

const KEY_MAP: Record<OptikChoice, string> = {
  A: "0",
  B: "1",
  C: "2",
  D: "3",
  E: "4",
};

/** Deterministik 11 haneli form kimliği (telefon tarayıcı eşleştirmesi). */
export function buildOptikFormId(testTitle: string, rows: OptikFormDrawRow[]): string {
  const seed = `${testTitle}|${rows.map((r) => `${r.number}:${r.answer ?? "-"}`).join(",")}`;
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  const n = Math.abs(hash) % 90000000000;
  return String(10000000000 + n).slice(0, 11);
}

export function encodeAnswerKey(
  rows: OptikFormDrawRow[],
  activeOptions: OptikChoice[],
): string {
  const valid = new Set(activeOptions);
  return rows
    .map((r) => {
      if (!r.answer || !valid.has(r.answer)) return "?";
      return KEY_MAP[r.answer] ?? "?";
    })
    .join("");
}

export function buildOptikScanPayload(params: {
  formId: string;
  testTitle: string;
  rows: OptikFormDrawRow[];
  activeOptions: OptikChoice[];
  netRule: OptikFormNetRule;
  bookletType?: OptikFormBookletType;
}): OptikScanPayload {
  return {
    v: 1,
    app: "edutest",
    id: params.formId,
    title: params.testTitle.slice(0, 48),
    n: params.rows.length,
    options: params.activeOptions,
    key: encodeAnswerKey(params.rows, params.activeOptions),
    net: params.netRule,
    booklet: params.bookletType ?? "none",
  };
}

/** QR koduna yazılacak kompakt JSON. */
export function buildOptikScanQrText(payload: OptikScanPayload): string {
  return JSON.stringify(payload);
}
