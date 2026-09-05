/**
 * Descarga real de un archivo de texto (CSV) — una capacidad del navegador,
 * no una llamada a un servicio de LuxePass. Mismo criterio que ya vale para
 * `downloadIcsFile` (Story 4.3) y "Upload photo" (Story 6.3).
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
