"""Extract question crop PNGs from Desktop .et drafts into fixtures/ (read-only copy)."""
from __future__ import annotations

import base64
import hashlib
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "fixtures"
DESKTOP = Path.home() / "Desktop"
SOURCES = ["y4.et", "t1.et", "taslak.et"]
MAX_FIXTURES = 15


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict] = []
    seen: set[str] = set()
    for src in SOURCES:
        path = DESKTOP / src
        if not path.exists():
            print(f"SKIP missing {path}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for q in data.get("questions") or []:
            b64 = q.get("image_base64")
            if not b64:
                continue
            raw = b64.split(",", 1)[-1] if "," in b64 else b64
            try:
                blob = base64.b64decode(raw)
            except Exception:
                continue
            digest = hashlib.sha256(blob).hexdigest()[:12]
            if digest in seen:
                continue
            seen.add(digest)
            order = int(q.get("order_index") or 0) + 1
            stem = f"{path.stem}_Q{order}_{digest}"
            out_png = OUT / f"{stem}.png"
            try:
                img = Image.open(io.BytesIO(blob)).convert("RGBA")
                img.save(out_png, format="PNG")
            except Exception as e:
                print(f"SKIP bad image {stem}: {e}")
                continue
            manifest.append(
                {
                    "file": out_png.name,
                    "sourceDraft": path.name,
                    "orderIndex": order - 1,
                    "questionId": q.get("id"),
                    "width": img.width,
                    "height": img.height,
                }
            )
            if len(manifest) >= MAX_FIXTURES:
                break
        if len(manifest) >= MAX_FIXTURES:
            break

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"extracted {len(manifest)} fixtures -> {OUT}")


if __name__ == "__main__":
    main()
