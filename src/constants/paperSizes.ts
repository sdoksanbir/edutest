/** Preset → (width_mm, height_mm) - backend PAPER_PRESETS_MM ile senkron */
export const PAPER_PRESETS_MM: Record<string, [number, number]> = {
  "A4 (210 x 297 mm)": [210, 297],
  "10 x 15 cm (4 x 6 in)": [100, 150],
  "13 x 18 cm (5 x 7 in)": [130, 180],
  "A6 (105 x 148 mm)": [105, 148],
  "A5 (148 x 210 mm)": [148, 210],
  "B5 (182 x 257 mm)": [182, 257],
  "9 x 13 cm (3.5 x 5 in)": [90, 130],
  "13 x 20 cm (5 x 8 in)": [130, 200],
  "20 x 25 cm (8 x 10 in)": [200, 250],
  "Letter #10 4 1/8 x 9 1/2 in": [104.78, 241.3],
  "Letter DL 110 x 220 mm": [110, 220],
  "Letter C6 114 x 162 mm": [114, 162],
  "Letter 8 1/2 x 11 in": [215.9, 279.4],
  "Legal 8 1/2 x 14 in": [215.9, 355.6],
  "A3 (297 x 420 mm)": [297, 420],
  "A3+ (329 x 483 mm)": [329, 483],
  "B4 (257 x 364 mm)": [257, 364],
  "B3 (364 x 515 mm)": [364, 515],
};

/** Görseldeki kağıt boyutu seçenekleri - backend PAPER_PRESETS_MM ile senkron */
export const PAPER_SIZE_OPTIONS = [
  "A4 (210 x 297 mm)",
  "10 x 15 cm (4 x 6 in)",
  "13 x 18 cm (5 x 7 in)",
  "A6 (105 x 148 mm)",
  "A5 (148 x 210 mm)",
  "B5 (182 x 257 mm)",
  "9 x 13 cm (3.5 x 5 in)",
  "13 x 20 cm (5 x 8 in)",
  "20 x 25 cm (8 x 10 in)",
  "Letter #10 4 1/8 x 9 1/2 in",
  "Letter DL 110 x 220 mm",
  "Letter C6 114 x 162 mm",
  "Letter 8 1/2 x 11 in",
  "Legal 8 1/2 x 14 in",
  "A3 (297 x 420 mm)",
  "A3+ (329 x 483 mm)",
  "B4 (257 x 364 mm)",
  "B3 (364 x 515 mm)",
  "Tam Boyutu Belirleyin",
] as const;

export type PaperSizeOption = (typeof PAPER_SIZE_OPTIONS)[number];
