/**
 * utils.ts — minimal className join helper.
 *
 * Avoids adding clsx/cn as a new dependency.
 * Filters falsy values and joins with a space.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
