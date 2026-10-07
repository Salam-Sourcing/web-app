// Hosted configuration remains restricted to publishable keys. The disposable
// backend is an explicit development-only path; it cannot enter a release build.
export function allowedBackend(
  url: string,
  key: string,
  development = false,
  fixture = false,
) {
  if (
    /^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  )
    return true;
  if (!development || !fixture || url !== "http://127.0.0.1:55431")
    return false;
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.role === "anon";
  } catch {
    return false;
  }
}
