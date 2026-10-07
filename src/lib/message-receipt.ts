/** Receipts reflect confirmed backend state, never a speculative successful send. */
export function messageReceipt(status: "sending" | "sent" | "seen") {
  return {
    label: status === "seen" ? "Seen" : status === "sent" ? "Sent" : "Sending",
    className: "message-receipt message-receipt-" + status,
    path:
      status === "seen"
        ? "m2 12 4 4 9-9 M11 16l9-9"
        : status === "sent"
          ? "m5 12 4 4 10-10"
          : "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2",
  };
}
