/**
 * LGS resmi şablon — sütun / filigran / çerçeve ayarları (diğer şablonlardan bağımsız).
 */
import type { WatermarkLayout } from "./visualProperties";
import type { PageFrameLineStyle } from "./pageFrame";

export type LgsPageDecor = {
  showColumnDivider: boolean;
  columnDividerText: string;
  columnDividerWidthPt: number;
  showColumnDividerText: boolean;
  centerLineBold: boolean;
  centerLineItalic: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkLayout: WatermarkLayout;
  watermarkAngleDeg: number;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkLogoUrl: string | null;
  showPageFrame: boolean;
  pageFrameColorMode: "theme" | "custom";
  pageFrameColor: string;
  pageFrameWidthPt: number;
  pageFrameInnerGapMm: number;
  pageFrameCornerRadiusMm: number;
  pageFrameLineStyle: PageFrameLineStyle;
};

export function defaultLgsPageDecor(): LgsPageDecor {
  return {
    showColumnDivider: true,
    columnDividerText: "SERKAN DOKSANBİR",
    columnDividerWidthPt: 0.5,
    showColumnDividerText: true,
    centerLineBold: false,
    centerLineItalic: false,
    showWatermark: false,
    watermarkText: "",
    watermarkLayout: "diagonal",
    watermarkAngleDeg: 45,
    watermarkOpacity: 20,
    watermarkSize: 90,
    watermarkLogoUrl: null,
    showPageFrame: false,
    pageFrameColorMode: "theme",
    pageFrameColor: "#1E88E5",
    pageFrameWidthPt: 1.5,
    pageFrameInnerGapMm: 3,
    pageFrameCornerRadiusMm: 2,
    pageFrameLineStyle: "solid",
  };
}

export function parseLgsPageDecor(raw: unknown): LgsPageDecor {
  const d = defaultLgsPageDecor();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const layout = String(o.watermarkLayout ?? d.watermarkLayout);
  const lineStyle = String(o.pageFrameLineStyle ?? d.pageFrameLineStyle);
  return {
    showColumnDivider: o.showColumnDivider !== false,
    columnDividerText: String(o.columnDividerText ?? d.columnDividerText),
    columnDividerWidthPt: Math.max(
      0.3,
      Math.min(4, Number(o.columnDividerWidthPt ?? d.columnDividerWidthPt) || d.columnDividerWidthPt),
    ),
    showColumnDividerText: o.showColumnDividerText !== false,
    centerLineBold: Boolean(o.centerLineBold),
    centerLineItalic: Boolean(o.centerLineItalic),
    showWatermark: Boolean(o.showWatermark),
    watermarkText: String(o.watermarkText ?? d.watermarkText),
    watermarkLayout:
      layout === "horizontal" || layout === "vertical" || layout === "diagonal"
        ? layout
        : d.watermarkLayout,
    watermarkAngleDeg: Math.max(
      -75,
      Math.min(75, Math.round(Number(o.watermarkAngleDeg ?? d.watermarkAngleDeg))),
    ),
    watermarkOpacity: Math.max(
      5,
      Math.min(80, Math.round(Number(o.watermarkOpacity ?? d.watermarkOpacity))),
    ),
    watermarkSize: Math.max(
      40,
      Math.min(160, Math.round(Number(o.watermarkSize ?? d.watermarkSize))),
    ),
    watermarkLogoUrl:
      o.watermarkLogoUrl == null || o.watermarkLogoUrl === ""
        ? null
        : String(o.watermarkLogoUrl),
    showPageFrame: Boolean(o.showPageFrame),
    pageFrameColorMode: o.pageFrameColorMode === "custom" ? "custom" : "theme",
    pageFrameColor: String(o.pageFrameColor ?? d.pageFrameColor),
    pageFrameWidthPt: Math.max(
      0.3,
      Math.min(6, Number(o.pageFrameWidthPt ?? d.pageFrameWidthPt) || d.pageFrameWidthPt),
    ),
    pageFrameInnerGapMm: Math.max(
      0,
      Math.min(20, Number(o.pageFrameInnerGapMm ?? d.pageFrameInnerGapMm) || d.pageFrameInnerGapMm),
    ),
    pageFrameCornerRadiusMm: Math.max(
      0,
      Math.min(
        15,
        Number(o.pageFrameCornerRadiusMm ?? d.pageFrameCornerRadiusMm) ||
          d.pageFrameCornerRadiusMm,
      ),
    ),
    pageFrameLineStyle:
      lineStyle === "dashed" || lineStyle === "dotted" || lineStyle === "solid"
        ? lineStyle
        : d.pageFrameLineStyle,
  };
}

export type PageDecorLive = LgsPageDecor;

/** LGS aktifse şablona özel dekor; değilse store değerleri */
export function resolvePageDecorForBanner(
  useLgsOfficialBanner: boolean,
  lgsPageDecor: LgsPageDecor | undefined,
  store: PageDecorLive,
): PageDecorLive {
  if (!useLgsOfficialBanner) return store;
  return parseLgsPageDecor(lgsPageDecor ?? defaultLgsPageDecor());
}
