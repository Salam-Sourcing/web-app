export function submitChatOnEnter(
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "isComposing">,
  composing: boolean,
  disabled: boolean,
) {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    !composing &&
    !disabled
  );
}
