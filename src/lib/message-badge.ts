export function messageBadge(count: unknown) {
  const unread =
    typeof count === "number" && Number.isSafeInteger(count) && count > 0
      ? count
      : 0;
  return {
    hidden: unread === 0,
    text: unread > 99 ? "99+" : String(unread),
    label: unread
      ? `Messages, ${unread} unread message${unread === 1 ? "" : "s"}`
      : "Messages",
  };
}

export function updateMessageBadges(root: ParentNode, count: unknown) {
  const view = messageBadge(count);
  root.querySelectorAll<HTMLElement>("[data-messages-link]").forEach((link) => {
    link.setAttribute("aria-label", view.label);
    const badge = link.querySelector<HTMLElement>("[data-message-count]");
    if (badge) {
      badge.textContent = view.text;
      badge.hidden = view.hidden;
    }
  });
}
