export type { AppLabels, RoomLabels, Locale } from "./types";
export { useLabels } from "./use-labels";
export { useLocaleStore } from "./locale.store";
export { t } from "./interpolate";

import type { AppLabels } from "./types";
import { en } from "./locales/en";
import { it } from "./locales/it";

const LABELS_MAP: Record<string, AppLabels> = {
  "en-US": en,
  "it-IT": it,
};

/**
 * Pure function — works outside React (validation helpers, etc.).
 * Falls back to English for unknown locales.
 */
export function getAppLabels(locale: string): AppLabels {
  return LABELS_MAP[locale] ?? en;
}
