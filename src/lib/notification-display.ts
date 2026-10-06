/** Only a fixed support destination is derived from this metadata. */
export function supportNotice(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const id = (data as Record<string, unknown>).case_id;
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
  );
}
export function notificationCanOpen(notice: {
  entity_type: string | null;
  entity_id: number | null;
  data?: unknown;
}) {
  return (
    supportNotice(notice.data) || !!(notice.entity_type && notice.entity_id)
  );
}
