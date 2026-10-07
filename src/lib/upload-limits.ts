export const photoUploadLimit = 5 * 1024 * 1024;
export const pdfUploadLimit = 10 * 1024 * 1024;

export function uploadSizeLimit(mime: string) {
  return mime === "application/pdf" ? pdfUploadLimit : photoUploadLimit;
}

export const attachmentLimitHint = "Photos up to 5 MB; PDFs up to 10 MB.";
