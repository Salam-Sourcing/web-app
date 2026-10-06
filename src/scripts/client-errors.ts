import {
  browserDiagnostic,
  diagnosticAsset,
  type ClientErrorCategory,
} from "../lib/client-errors";
export function bindClientErrorReporting() {
  const root = document.querySelector<HTMLElement>("#private-content");
  if (!root) return;
  let sent = 0,
    last = 0,
    stopped = false;
  const report = (
    category: ClientErrorCategory,
    error: unknown,
    location?: { filename: string; line: number; column: number },
  ) => {
    if (
      stopped ||
      root.hidden ||
      !root.isConnected ||
      document.hidden ||
      !navigator.onLine ||
      sent >= 3 ||
      Date.now() - last < 30000
    )
      return;
    const assets = new Set<string>();
    for (const node of document.querySelectorAll<
      HTMLScriptElement | HTMLLinkElement
    >('script[src],link[rel="modulepreload"]')) {
      const source = node instanceof HTMLScriptElement ? node.src : node.href;
      const asset = diagnosticAsset(source, window.location.origin);
      if (asset) assets.add(asset);
    }
    const event = browserDiagnostic(
      category,
      error,
      window.location.origin,
      assets,
      location,
    );
    sent++;
    last = Date.now();
    void fetch("/api/client-error", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});
  };
  const uncaught = (event: ErrorEvent) =>
    report("uncaught_error", event.error, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  const rejection = (event: PromiseRejectionEvent) =>
    report("unhandled_rejection", event.reason);
  const stop = () => {
    stopped = true;
    window.removeEventListener("error", uncaught);
    window.removeEventListener("unhandledrejection", rejection);
  };
  window.addEventListener("error", uncaught);
  window.addEventListener("unhandledrejection", rejection);
  window.addEventListener("pagehide", stop, { once: true });
  window.addEventListener("salam-logout", stop, { once: true });
}
