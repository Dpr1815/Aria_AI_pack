import type { useRoomStore } from "../stores/room.store";
import type { WsOutboundMessage } from "../types";

/* ─────────────────────────────────────────────
 * Action Registry — Core
 * ─────────────────────────────────────────────
 * A general-purpose registry that maps server
 * action identifiers to client-side handlers.
 *
 * Design goals:
 *  - Open/closed principle: add actions without
 *    touching the WS hook or any switch statement.
 *  - Handlers are pure functions with a well-
 *    defined context — easy to test in isolation.
 *  - Payload is loosely typed at the registry
 *    level; each handler narrows it internally.
 * ───────────────────────────────────────────── */

/* ── Types ── */

/**
 * Context injected into every action handler.
 *
 * Provides everything a handler might need without
 * coupling it to React hooks or component internals.
 */
export interface ActionContext {
  /** Zustand store — call getState() for reads, setState() or actions for writes. */
  store: typeof useRoomStore;
  /** Action-specific payload from the server (may be undefined for signal-only actions). */
  payload: Record<string, unknown> | undefined;
  /** Send a message back through the active WebSocket connection. */
  send: (message: WsOutboundMessage) => void;
}

/** Signature every action handler must satisfy. */
export type ActionHandler = (ctx: ActionContext) => void | Promise<void>;

/**
 * The shape of the `action` field the server embeds
 * in WS messages.  Supports two forms:
 *
 *  - **string** — signal-only, no payload (backward-compat)
 *    `"openAssessment"`
 *
 *  - **object** — typed action with optional payload
 *    `{ type: "openAssessment", payload: { ... } }`
 */
export type ServerAction =
  | string
  | { type: string; payload?: Record<string, unknown> };

/* ── Registry ── */

/**
 * Creates a self-contained action registry.
 *
 * Usage:
 * ```ts
 * const registry = createActionRegistry();
 * registry.register("openAssessment", openAssessmentHandler);
 * // … later, inside WS message handler:
 * registry.dispatch(serverAction, ctx);
 * ```
 */
export function createActionRegistry() {
  const handlers = new Map<string, ActionHandler>();

  return {
    /**
     * Register a handler for a given action type.
     * Throws in dev if the same type is registered twice
     * (catches copy-paste bugs early).
     */
    register(actionType: string, handler: ActionHandler): void {
      if (import.meta.env.DEV && handlers.has(actionType)) {
        console.warn(
          `[ActionRegistry] Handler for "${actionType}" is being overwritten. This is likely a bug.`,
        );
      }
      handlers.set(actionType, handler);
    },

    /**
     * Dispatch a server action to the matching handler.
     *
     * Accepts both string and object forms of `ServerAction`.
     * Silently ignores unknown action types (the server may
     * introduce actions before the client supports them).
     */
    dispatch(
      action: ServerAction,
      baseCtx: Omit<ActionContext, "payload">,
    ): void {
      const { type, payload } = normalizeAction(action);

      const handler = handlers.get(type);
      if (!handler) {
        if (import.meta.env.DEV) {
          console.debug(
            `[ActionRegistry] No handler for action "${type}" — skipping.`,
          );
        }
        return;
      }

      try {
        const result = handler({ ...baseCtx, payload });

        // If the handler is async, catch unhandled rejections.
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(
              `[ActionRegistry] Async handler "${type}" threw:`,
              err,
            );
          });
        }
      } catch (err) {
        console.error(`[ActionRegistry] Handler "${type}" threw:`, err);
      }
    },

    /** Check whether a handler exists for a given type. */
    has(actionType: string): boolean {
      return handlers.has(actionType);
    },

    /** Number of registered handlers (useful in tests). */
    get size(): number {
      return handlers.size;
    },
  };
}

/* ── Helpers ── */

/** Normalize both string and object forms into a consistent shape. */
function normalizeAction(action: ServerAction): {
  type: string;
  payload: Record<string, unknown> | undefined;
} {
  if (typeof action === "string") {
    return { type: action, payload: undefined };
  }
  return { type: action.type, payload: action.payload };
}
