export const privateRoots = [
  "discover",
  "account",
  "company",
  "sell",
  "listings",
  "suppliers",
  "enquiries",
  "quotes",
  "messages",
  "deals",
  "invitations",
  "notifications",
  "saved",
] as const;
export function isPrivatePath(path: string) {
  return privateRoots.some(
    (root) => path === "/" + root || path.startsWith("/" + root + "/"),
  );
}
export function cleanLegacyPath(path: string) {
  const clean = path.replace(/^\/app(?=\/|$)/, "");
  return clean.startsWith("/") &&
    !clean.startsWith("//") &&
    isPrivatePath(clean)
    ? clean
    : "/discover";
}
