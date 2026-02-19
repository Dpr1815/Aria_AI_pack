/**
 * Simple placeholder replacement for translated strings.
 *
 * @example
 * t("At least {min} characters", { min: 8 })
 * // => "At least 8 characters"
 */
export function t(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key: string) => String(params[key] ?? `{${key}}`),
  );
}
