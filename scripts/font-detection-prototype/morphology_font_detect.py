"""
OpenCV morphology lab: connected-component body glyph height estimate.

No PaddleOCR. Production EduTest code is untouched.
Writes console table + out/morphology/_summary.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / "fixtures"
OUT = ROOT / "out" / "morphology"


def estimate_canonical_font_height(image_path: str):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None, "Görsel okunamadı"

    _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    _num_labels, _labels, stats, _centroids = cv2.connectedComponentsWithStats(
        binary, connectivity=8
    )

    widths = stats[1:, cv2.CC_STAT_WIDTH]
    heights = stats[1:, cv2.CC_STAT_HEIGHT]
    areas = stats[1:, cv2.CC_STAT_AREA]

    if len(heights) < 5:
        return None, "Yetersiz mürekkep / bileşen (FAIL)"

    # Formül, çizgi ve başlıkları ayıklama
    valid_mask = (
        (heights >= 8)
        & (heights <= 80)
        & (widths >= 3)
        & (widths <= 120)
        & (areas >= 20)
        & (widths / heights < 3.0)
        & (heights / widths < 3.5)
    )

    filtered_heights = heights[valid_mask]

    if len(filtered_heights) < 5:
        return None, "Filtreleme sonrası yetersiz harf bileşeni"

    q25, q75 = np.percentile(filtered_heights, [25, 75])
    iqr = q75 - q25
    lower_bound = max(8, q25 - 1.0 * iqr)
    upper_bound = q75 + 1.0 * iqr

    body_heights = filtered_heights[
        (filtered_heights >= lower_bound) & (filtered_heights <= upper_bound)
    ]

    if len(body_heights) == 0:
        body_heights = filtered_heights

    canonical_px = float(np.median(body_heights))
    sample_count = int(len(body_heights))

    return {
        "canonical_px": round(canonical_px, 1),
        "sample_count": sample_count,
        "spread_min": int(np.min(body_heights)),
        "spread_max": int(np.max(body_heights)),
        "component_count": int(len(heights)),
        "filtered_count": int(len(filtered_heights)),
    }, "SUCCESS"


def _relative_spread(heights: list[float]) -> float | None:
    if len(heights) < 2:
        return None
    med = float(np.median(heights))
    if med <= 0:
        return None
    return float((max(heights) - min(heights)) / med)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    fixtures_dir = FIXTURES if FIXTURES.exists() else Path("fixtures")

    if args:
        target_files = [Path(a) for a in args]
    else:
        target_files = sorted(fixtures_dir.glob("*.png"))

    if not target_files:
        print("Test edilecek görsel bulunamadı.")
        print(f"Beklenen klasör: {FIXTURES}")
        print("Önce: python extract_fixtures_from_et.py")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)

    print(f"{'Dosya':<28} | {'Durum':<10} | {'Kanonik Px':<12} | {'Örneklem':<10} | {'Aralık'}")
    print("-" * 80)

    rows: list[dict] = []
    for file in target_files:
        file_path = str(file)
        name = Path(file_path).name
        res, status = estimate_canonical_font_height(file_path)
        row = {"file": name, "status": status, "ok": res is not None}
        if res:
            row.update(res)
            print(
                f"{name:<28} | {status:<10} | {res['canonical_px']:<12} | "
                f"{res['sample_count']:<10} | {res['spread_min']}-{res['spread_max']} px"
            )
        else:
            print(f"{name:<28} | {status:<10} | -            | -          | -")
        rows.append(row)
        (OUT / f"{Path(name).stem}.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    successes = [r for r in rows if r.get("ok") and r.get("canonical_px") is not None]
    heights = [float(r["canonical_px"]) for r in successes]
    by_draft: dict[str, list[float]] = {}
    for r in successes:
        draft = str(r["file"]).split("_")[0]
        by_draft.setdefault(draft, []).append(float(r["canonical_px"]))

    draft_stats = {
        draft: {
            "n": len(hs),
            "median": round(float(np.median(hs)), 1),
            "min": round(float(min(hs)), 1),
            "max": round(float(max(hs)), 1),
            "relativeSpread": None
            if (sp := _relative_spread(hs)) is None
            else round(sp, 4),
        }
        for draft, hs in by_draft.items()
    }

    overall_spread = _relative_spread(heights)
    summary = {
        "method": "opencv-connected-components-morphology",
        "questionCount": len(rows),
        "successCount": len(successes),
        "successRate": round(len(successes) / len(rows), 4) if rows else 0.0,
        "canonicalHeightsPx": heights,
        "overallRelativeSpread": None
        if overall_spread is None
        else round(overall_spread, 4),
        "byDraft": draft_stats,
        "passCriteria": {
            "successRateAtLeast80": bool(len(successes) / len(rows) >= 0.8) if rows else False,
            "perDraftSpreadWithin15pct": {
                draft: bool(st["relativeSpread"] is not None and st["relativeSpread"] <= 0.15)
                for draft, st in draft_stats.items()
            },
            "note": (
                "Morphology lab gate: >=80% measurable; within a single draft, "
                "canonical height relative spread ideally <=15% (mixed fonts may fail)."
            ),
        },
        "rows": rows,
    }
    (OUT / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("-" * 80)
    print(
        f"SUCCESS {summary['successCount']}/{summary['questionCount']} "
        f"({100 * summary['successRate']:.0f}%) | "
        f"overallSpread={summary['overallRelativeSpread']} | "
        f"wrote {OUT / '_summary.json'}"
    )
    for draft, st in draft_stats.items():
        print(
            f"  {draft}: n={st['n']} median={st['median']} "
            f"range={st['min']}-{st['max']} spread={st['relativeSpread']}"
        )
    return 0 if summary["successCount"] > 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
