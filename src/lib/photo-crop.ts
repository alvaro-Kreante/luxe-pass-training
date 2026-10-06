/**
 * Story 10.10 — el admin encuadra y elige el tamaño de cada foto del lounge
 * antes de subirla (PhotoCropOpen 23, PhotoCropSize 24). El encuadre lo da
 * `react-easy-crop` en píxeles del original; aquí se calcula el tamaño
 * final y se recorta en un `<canvas>` del navegador.
 */

/** La forma de las fotos del lounge (decisión de diseño, DESIGN-SYSTEM.md §6 · 10.10). */
export const PHOTO_ASPECT = 3 / 2;

export type PhotoSizeId = "large" | "standard" | "light";

export interface PhotoSize {
  id: PhotoSizeId;
  label: string;
  longEdge: number;
  hint: string;
  recommended?: boolean;
}

export const PHOTO_SIZES: PhotoSize[] = [
  { id: "large", label: "Large", longEdge: 2400, hint: "Sharpest on large screens" },
  { id: "standard", label: "Standard", longEdge: 1600, hint: "Sharp on every phone and laptop", recommended: true },
  { id: "light", label: "Light", longEdge: 1200, hint: "Fastest on a slow connection" },
];

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Recorte en píxeles del original. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export function isAcceptedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** El mayor recorte 3 : 2 centrado en la foto. */
export function centeredCrop(width: number, height: number): CropArea {
  if (width / height > PHOTO_ASPECT) {
    const cropWidth = Math.round(height * PHOTO_ASPECT);
    return { x: Math.round((width - cropWidth) / 2), y: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / PHOTO_ASPECT);
  return { x: 0, y: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

/** Lado largo reducido a `longEdge`, sin agrandar nunca un recorte más pequeño. */
export function outputSize(area: CropArea, longEdge: number): Dimensions {
  const scale = Math.min(1, longEdge / Math.max(area.width, area.height));
  return { width: Math.round(area.width * scale), height: Math.round(area.height * scale) };
}

/** Peso aproximado de un JPEG de calidad 0.82 de fotos de interior (~0,18 bytes por píxel). */
export function estimatedKb({ width, height }: Dimensions): number {
  return Math.max(1, Math.round((width * height * 0.18) / 1000));
}

export function formatKb(kb: number): string {
  return kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`;
}

/** Recorta y comprime en el navegador; el resultado es siempre JPEG. */
export async function cropImage(source: Blob, area: CropArea, longEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const size = outputSize(area, longEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't crop photos");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, size.width, size.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("This photo can't be read"))), "image/jpeg", 0.82);
  });
}

/** Medidas del original, para el recorte por defecto y el texto "6000 × 4000". */
export async function imageDimensions(source: Blob): Promise<Dimensions> {
  const bitmap = await createImageBitmap(source);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return dimensions;
}
