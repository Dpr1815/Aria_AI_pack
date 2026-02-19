import { useMemo } from "react";
import { useLocaleStore } from "./locale.store";
import { getAppLabels } from "./index";
import type { AppLabels } from "./types";

/**
 * Returns the full `AppLabels` object for the current locale.
 *
 * Pass a `localeOverride` to ignore the global store
 * (e.g. room components where locale comes from the agent config).
 */
export function useLabels(localeOverride?: string): AppLabels {
  const storeLocale = useLocaleStore((s) => s.locale);
  const locale = localeOverride ?? storeLocale;
  return useMemo(() => getAppLabels(locale), [locale]);
}
