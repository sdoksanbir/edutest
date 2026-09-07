/**
 * Resim dosyası güvenlik validasyonu.
 * Sadece izin verilen MIME tipleri ve boyut limiti.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

export function isAllowedImageSize(file: File): boolean {
  return file.size > 0 && file.size <= MAX_IMAGE_SIZE_BYTES;
}

export function validateImageFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!isAllowedImageType(file)) {
    return { ok: false, error: `Geçersiz dosya türü. Sadece JPG, PNG ve WebP desteklenir.` };
  }
  if (!isAllowedImageSize(file)) {
    return {
      ok: false,
      error: `Dosya çok büyük. Maksimum ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return { ok: true };
}
