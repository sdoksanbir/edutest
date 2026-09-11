import type { LayoutItem } from "../api/client";

/** Layout klonlarında base64 taşıma — 30+ soruda JSON.stringify ana iş parçacığını dondurur. */
export function stripLayoutImages<T extends LayoutItem>(layout: T[]): T[] {
  return layout.map((item) => {
    if (item.image_base64 == null) return item;
    const { image_base64: _drop, ...rest } = item;
    return rest as T;
  });
}

/** Geometri-only deep clone (base64 yok). */
export function cloneLayoutGeometry(layout: LayoutItem[]): LayoutItem[] {
  return JSON.parse(JSON.stringify(stripLayoutImages(layout))) as LayoutItem[];
}
