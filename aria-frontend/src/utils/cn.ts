/**
 * Merges class names, filtering out falsy values.
 * Lightweight alternative to `clsx` — add `tailwind-merge` if you
 * need deduplication of conflicting Tailwind utilities.
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}
