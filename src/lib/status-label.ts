/** Display-only labels. Stored values and workflow comparisons remain unchanged. */
export function statusLabel(value: string | null | undefined): string {
  const words =
    value
      ?.trim()
      .split(/[_\s-]+/)
      .filter(Boolean) ?? [];
  return words.length
    ? words
        .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    : "Not Available";
}
