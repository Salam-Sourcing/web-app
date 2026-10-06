import type { ThreadMessage } from "./procurement";

export type LocalTextMessage = {
  client_message_id: string;
  content: string;
  status: "Sending…" | "Sent" | "Not confirmed · Retry";
};

/** Local bubbles never enter server history or pagination cursors. */
export class ChatOutbox {
  readonly messages = new Map<string, LocalTextMessage>();

  start(intent: { client_message_id: string; content: string }) {
    const existing = this.messages.get(intent.client_message_id);
    if (existing && existing.content !== intent.content)
      throw new Error("Retry must keep the original message.");
    this.messages.set(intent.client_message_id, {
      ...intent,
      status: "Sending…",
    });
  }

  status(key: string, status: LocalTextMessage["status"]) {
    const message = this.messages.get(key);
    if (message) message.status = status;
  }

  reconcile(rows: ThreadMessage[]) {
    for (const row of rows)
      if (row.outgoing && row.client_message_id)
        this.messages.delete(row.client_message_id);
  }
}
