/** Supabase returns either SVG or an SVG data URL, depending on SDK version. */
export function authenticatorQrUrl(value: string): string {
  if (typeof value !== "string" || value.length > 500_000)
    throw new Error("QR code unavailable. Enter the setup key manually.");
  let svg = value.trim();
  if (svg.startsWith("data:")) {
    const match =
      /^data:image\/svg\+xml(?:;(?:utf-8|charset=utf-8))?(;base64)?,([\s\S]*)$/i.exec(
        svg,
      );
    if (!match)
      throw new Error("Unsupported QR image. Enter the setup key manually.");
    try {
      svg = match[1]
        ? new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
          )
        : match[2].trimStart().startsWith("<")
          ? match[2]
          : decodeURIComponent(match[2]);
    } catch {
      throw new Error("QR code unavailable. Enter the setup key manually.");
    }
  }
  // Supabase Auth's SVGo renderer adds a generator comment after its XML
  // declaration. Validate past that prolog while retaining the complete image.
  if (
    !/^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(
      svg,
    )
  )
    throw new Error("QR code unavailable. Enter the setup key manually.");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
