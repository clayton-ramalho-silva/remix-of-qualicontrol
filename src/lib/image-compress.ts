/**
 * Comprime uma imagem no client antes do upload.
 * - Redimensiona para no máx. `maxDim` no lado maior
 * - Re-encoda em JPEG com qualidade `quality`
 * - Retorna um File pronto para upload (com extensão .jpg)
 *
 * Se algo falhar (formato exótico, browser muito antigo), devolve o arquivo original.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.8;

  if (!file.type.startsWith("image/")) return file;
  // Se já é pequeno, não vale a pena re-encodar
  if (file.size < 400 * 1024) return file;

  try {
    // createImageBitmap respeita EXIF orientation em browsers modernos
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as any).catch(
      () => createImageBitmap(file)
    );
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    let blob: Blob | null = null;

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d ctx");
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d ctx");
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise<Blob | null>(res =>
        canvas.toBlob(res, "image/jpeg", quality)
      );
    }
    bitmap.close?.();

    if (!blob) return file;
    // Se a "compressão" piorou o tamanho, mantém o original
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}