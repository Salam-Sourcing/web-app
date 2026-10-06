const maximumBytes = 5 * 1024 * 1024;
const prepared = new WeakMap<File, Promise<File>>();

export function prepareListingImage(file: File): Promise<File> {
  let result = prepared.get(file);
  if (!result) {
    result = resize(file).catch((error) => {
      prepared.delete(file);
      throw error;
    });
    prepared.set(file, result);
  }
  return result;
}
async function resize(file: File): Promise<File> {
  if (
    !file.size ||
    file.size > 50 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error(
      "Choose a JPEG, PNG or WebP image up to 50 MB for preparation.",
    );
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 100_000_000
    )
      throw new Error("Choose an image with supported dimensions.");
    const scale = Math.min(1, 1800 / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    try {
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image preparation is unavailable in this browser.");
      // Browser decoding applies EXIF orientation; encoding removes stale orientation metadata.
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(
                  new Error(
                    "Image could not be prepared. Choose another file.",
                  ),
                ),
          file.type,
          0.84,
        ),
      );
      if (blob.type !== file.type)
        throw new Error(
          "This browser cannot prepare this image format. Choose JPEG or PNG.",
        );
      if (!blob.size || blob.size > maximumBytes)
        throw new Error(
          "This image is still larger than 5 MB after preparation. Choose a smaller image.",
        );
      return new File([blob], file.name, {
        type: blob.type,
        lastModified: file.lastModified,
      });
    } finally {
      canvas.width = canvas.height = 0;
    }
  } catch (error) {
    if (error instanceof Error && !(error instanceof DOMException)) throw error;
    throw new Error(
      "Image could not be read. Choose another JPEG, PNG or WebP.",
    );
  } finally {
    image.src = "";
    URL.revokeObjectURL(url);
  }
}
