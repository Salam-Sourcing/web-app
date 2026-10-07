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

export function notificationPresentation(notice: {
  notification_type: string;
  title: string;
  body: string | null;
  source_name?: string | null;
  preview?: string | null;
  context_name?: string | null;
}) {
  const type = notice.notification_type;
  const titles: Record<string, string> = {
    new_message: "New message",
    new_enquiry: "New enquiry",
    enquiry_invitation: "Enquiry invitation",
    new_quote: "New quote",
    quote_updated: "Quote updated",
    quote_accepted: "Quote accepted",
    quote_rejected: "Quote declined",
    quote_withdrawn: "Quote withdrawn",
    deal_update: "Deal progress updated",
    listing_approved: "Listing approved",
    listing_rejected: "Listing needs attention",
  };
  const title =
    titles[type] ??
    (notice.title === "Company update"
      ? type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
      : notice.title);
  const icon = type.includes("message")
    ? "messages"
    : type.includes("quote") || type.includes("enquiry")
      ? "enquiries"
      : type.includes("listing")
        ? "box"
        : type.includes("verification")
          ? "shield"
          : type.includes("deal")
            ? "briefcase"
            : "bell";
  return {
    title,
    icon,
    source:
      notice.source_name ||
      (type === "new_message"
        ? "Conversation update"
        : "Salam Sourcing Marketplace"),
    preview:
      notice.preview ||
      (notice.body === "Open Salam to view the details."
        ? "Open this update to see the details."
        : notice.body) ||
      "Open this update to see the details.",
    context: notice.context_name || "",
    openLabel:
      type === "new_message"
        ? "Open conversation"
        : type.includes("enquiry")
          ? "View enquiry"
          : type.includes("quote")
            ? "View quote"
            : "View update",
  };
}
export const notificationIconPaths: Record<string, string> = {
  messages:
    "M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z",
  enquiries: "M8 3H3v18h18V3h-5 M8 2h8v4H8z M7 11h10 M7 15h7",
  box: "M3 6l9-4 9 4v13l-9 4-9-4z M3 6l9 4 9-4 M12 10v13",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  briefcase: "M3 7h18v14H3z M8 7V3h8v4 M3 12h18",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
};
