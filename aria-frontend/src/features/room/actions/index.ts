/* ─────────────────────────────────────────────
 * Action Registry — Initialization
 * ─────────────────────────────────────────────
 * Creates the singleton registry and registers
 * every known action handler.
 *
 * To add a new server action:
 *  1. Create a handler in ./handlers/<action-name>.ts
 *  2. Import it below
 *  3. Call registry.register("<actionType>", handler)
 *
 * That's it — no switch statements, no WS hook
 * changes, no store modifications needed.
 * ───────────────────────────────────────────── */

export { createActionRegistry } from "./action-registry";
export type {
  ActionContext,
  ActionHandler,
  ServerAction,
} from "./action-registry";

import { createActionRegistry } from "./action-registry";

/* ── Handler imports ── */
import { openAssessment } from "./handlers/open-assessment";

/* ── Singleton registry ── */
export const actionRegistry = createActionRegistry();

/* ── Registrations ── */
actionRegistry.register("openAssessment", openAssessment);
