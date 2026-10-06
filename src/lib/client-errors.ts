export type ClientErrorCategory = "uncaught_error" | "unhandled_rejection";
export type DiagnosticFrame = { asset: string; line: number; column: number };
export type ClientErrorEvent = {
  category: ClientErrorCategory;
  kind: string;
  frames: DiagnosticFrame[];
};
const kinds = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "UnknownError",
]);
const assetPath =
  /^\/_astro\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.[A-Za-z0-9_-]{6,}\.js$/;
/** Compiled code locations only; never private routes, queries or arbitrary stacks. */
export function diagnosticAsset(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin);
    return url.origin === origin &&
      !url.search &&
      !url.hash &&
      assetPath.test(url.pathname)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
}
export function clientErrorEvent(
  input: Record<string, unknown>,
): ClientErrorEvent | null {
  if (
    Object.keys(input).some(
      (key) => !["category", "kind", "frames"].includes(key),
    ) ||
    !["uncaught_error", "unhandled_rejection"].includes(String(input.category))
  )
    return null;
  const kind = input.kind ?? "UnknownError",
    frames = input.frames ?? [];
  if (
    typeof kind !== "string" ||
    !kinds.has(kind) ||
    !Array.isArray(frames) ||
    frames.length > 8
  )
    return null;
  const safe: DiagnosticFrame[] = [];
  for (const frame of frames) {
    if (
      !frame ||
      typeof frame !== "object" ||
      Array.isArray(frame) ||
      Object.keys(frame).length !== 3 ||
      typeof frame.asset !== "string" ||
      frame.asset.length > 180 ||
      !assetPath.test(frame.asset) ||
      !Number.isSafeInteger(frame.line) ||
      frame.line < 1 ||
      frame.line > 10000000 ||
      !Number.isSafeInteger(frame.column) ||
      frame.column < 1 ||
      frame.column > 10000000
    )
      return null;
    safe.push({ asset: frame.asset, line: frame.line, column: frame.column });
  }
  return {
    category: input.category as ClientErrorCategory,
    kind,
    frames: safe,
  };
}
/** Extract locations in known loaded bundles; raw exception text is discarded. */
export function browserDiagnostic(
  category: ClientErrorCategory,
  error: unknown,
  origin: string,
  loadedAssets: Set<string>,
  location?: { filename: string; line: number; column: number },
): ClientErrorEvent {
  const frames: DiagnosticFrame[] = [];
  let kind = "UnknownError";
  const add = (filename: string, line: number, column: number) => {
    const asset = diagnosticAsset(filename, origin);
    if (!asset || !loadedAssets.has(asset) || frames.length >= 8) return;
    const frame = { asset, line, column };
    if (
      clientErrorEvent({ category, kind, frames: [frame] }) &&
      !frames.some(
        (f) => f.asset === asset && f.line === line && f.column === column,
      )
    )
      frames.push(frame);
  };
  try {
    if (error instanceof Error) {
      const name = error.name,
        stack = error.stack;
      if (kinds.has(name)) kind = name;
      if (typeof stack === "string") {
        for (const line of stack.slice(0, 16000).split("\n").slice(1, 65)) {
          const match = /(?:\(|@|\s)(https?:\/\/[^\s()]+):(\d+):(\d+)\)?$/.exec(
            line,
          );
          if (match) add(match[1], Number(match[2]), Number(match[3]));
        }
      }
    }
    if (location) add(location.filename, location.line, location.column);
  } catch {
    /* Diagnostic failures must not break the UI. */
  }
  return { category, kind, frames };
}
export function diagnosticGroup(event: ClientErrorEvent): string {
  const signature = JSON.stringify(event);
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i++)
    hash = Math.imul(hash ^ signature.charCodeAt(i), 16777619);
  return "web-" + (hash >>> 0).toString(16).padStart(8, "0");
}
