import { AccessError, textField } from "./security";
import { MESSAGE_LIMIT } from "./client-contracts";

export function messageCaption(value: unknown): string {
  return textField({ caption: value ?? "" }, "caption", MESSAGE_LIMIT, 0);
}
export async function captionHash(caption: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(caption),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function sameAttachmentMessage(
  message: {
    conversation_id: number;
    sender_user_id: string | null;
    sender_company_id: number | null;
    client_message_id: string | null;
    message_type: string;
    content: string | null;
  } | null,
  expected: {
    conversation: number;
    user: string;
    company: number;
    key: string;
    caption: string;
  },
) {
  if (
    !message ||
    message.conversation_id !== expected.conversation ||
    message.sender_user_id !== expected.user ||
    message.sender_company_id !== expected.company ||
    message.client_message_id !== expected.key ||
    message.message_type !== "attachment" ||
    (message.content ?? "") !== expected.caption
  )
    throw new AccessError(
      409,
      "retry_changed",
      "Retry must use the same conversation, company, file and caption.",
    );
}
