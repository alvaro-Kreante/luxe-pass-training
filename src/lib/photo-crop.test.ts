import { describe, expect, it } from "vitest";

import { PHOTO_ASPECT, PHOTO_SIZES, centeredCrop, estimatedKb, isAcceptedImage, outputSize } from "./photo-crop";

/** Story 10.10 — PhotoCropOpen (23) / PhotoCropSize (24): proporción, tamaños y pesos. */
describe("el recorte de una foto", () => {
  it("la proporción fija es 3 : 2 y hay tres tamaños, Standard el recomendado", () => {
    expect(PHOTO_ASPECT).toBeCloseTo(3 / 2);
    expect(PHOTO_SIZES.map((size) => [size.id, size.longEdge])).toEqual([
      ["large", 2400],
      ["standard", 1600],
      ["light", 1200],
    ]);
    expect(PHOTO_SIZES.find((size) => size.recommended)?.id).toBe("standard");
  });

  it("sin encuadre elegido, el recorte es el mayor 3 : 2 centrado", () => {
    expect(centeredCrop(6000, 4000)).toEqual({ x: 0, y: 0, width: 6000, height: 4000 });
    expect(centeredCrop(4000, 4000)).toEqual({ x: 0, y: 667, width: 4000, height: 2667 });
    expect(centeredCrop(3000, 1000)).toEqual({ x: 750, y: 0, width: 1500, height: 1000 });
  });

  it("reduce al tamaño elegido manteniendo la proporción y nunca agranda", () => {
    expect(outputSize({ x: 0, y: 0, width: 6000, height: 4000 }, 1600)).toEqual({ width: 1600, height: 1067 });
    expect(outputSize({ x: 0, y: 0, width: 4286, height: 2857 }, 1200)).toEqual({ width: 1200, height: 800 });
    // Un recorte de 900 px de ancho no sube a 1600.
    expect(outputSize({ x: 0, y: 0, width: 900, height: 600 }, 1600)).toEqual({ width: 900, height: 600 });
  });

  it("estima el peso del resultado", () => {
    expect(estimatedKb({ width: 2400, height: 1600 })).toBeGreaterThan(estimatedKb({ width: 1600, height: 1067 }));
    expect(estimatedKb({ width: 1600, height: 1067 })).toBeGreaterThan(estimatedKb({ width: 1200, height: 800 }));
  });

  it("solo acepta JPEG, PNG y WebP", () => {
    expect(isAcceptedImage(new File(["x"], "terrace.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isAcceptedImage(new File(["x"], "terrace.png", { type: "image/png" }))).toBe(true);
    expect(isAcceptedImage(new File(["x"], "terrace.webp", { type: "image/webp" }))).toBe(true);
    expect(isAcceptedImage(new File(["x"], "ainsworth-menu.pdf", { type: "application/pdf" }))).toBe(false);
    expect(isAcceptedImage(new File(["x"], "terrace.heic", { type: "image/heic" }))).toBe(false);
  });
});
