/**
 * Conditional className joiner.
 *
 * Deliberately dependency-free: this site owns all of its class strings, so
 * the conflict-resolution that `tailwind-merge` provides is not needed and
 * would only add bundle weight. Order-sensitive overrides are handled by
 * putting the override last in the argument list.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
