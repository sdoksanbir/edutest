# Font detection lab (no production wiring)

OpenCV morphology prototype for body-text height estimation on real EduTest crops.
Does **not** touch `src/` or PDF export.

## Setup

```bash
# Prefer existing conda env (has OpenCV already):
C:\Users\sdoks\anaconda3\envs\edutest_paddle\python.exe -m pip install -r requirements.txt

# Or any Python 3.10+:
python -m pip install -r requirements.txt
```

## Extract fixtures

Copies question PNGs from Desktop drafts (`y4.et`, `t1.et`, `taslak.et`):

```bash
python extract_fixtures_from_et.py
```

## Run morphology detector

```bash
python morphology_font_detect.py
# or specific files:
python morphology_font_detect.py fixtures/t1_Q1_*.png
```

Outputs:
- console table
- `out/morphology/*.json` per image
- `out/morphology/_summary.json`

## Gate (lab only)

- success rate ≥ 80%
- within one draft, relative spread of canonical heights ideally ≤ 15%
