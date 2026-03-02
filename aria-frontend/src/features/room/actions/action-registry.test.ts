import { createActionRegistry } from "./action-registry";
import type { ActionHandler, ActionContext } from "./action-registry";

describe("createActionRegistry", () => {
  let registry: ReturnType<typeof createActionRegistry>;

  beforeEach(() => {
    registry = createActionRegistry();
  });

  // ── register + has + size ──

  describe("register + has + size", () => {
    it("registers a handler and has() returns true", () => {
      registry.register("test", vi.fn());
      expect(registry.has("test")).toBe(true);
    });

    it("has() returns false for unregistered action", () => {
      expect(registry.has("unknown")).toBe(false);
    });

    it("size reflects number of registered handlers", () => {
      expect(registry.size).toBe(0);
      registry.register("a", vi.fn());
      registry.register("b", vi.fn());
      expect(registry.size).toBe(2);
    });
  });

  // ── dispatch ──

  describe("dispatch — string action form", () => {
    it("dispatches to correct handler with payload=undefined", () => {
      const handler = vi.fn();
      registry.register("greet", handler);

      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      registry.dispatch("greet", baseCtx);

      expect(handler).toHaveBeenCalledWith({
        ...baseCtx,
        payload: undefined,
      });
    });
  });

  describe("dispatch — object action form", () => {
    it("dispatches to correct handler with type and payload", () => {
      const handler = vi.fn();
      registry.register("openAssessment", handler);

      const payload = { assessment: { testContent: "test" } };
      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      registry.dispatch({ type: "openAssessment", payload }, baseCtx);

      expect(handler).toHaveBeenCalledWith({
        ...baseCtx,
        payload,
      });
    });

    it("handles object action with no payload field", () => {
      const handler = vi.fn();
      registry.register("signal", handler);

      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      registry.dispatch({ type: "signal" }, baseCtx);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ payload: undefined }),
      );
    });
  });

  describe("dispatch — unknown action", () => {
    it("silently ignores unknown action type (does not throw)", () => {
      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      expect(() => registry.dispatch("nonexistent", baseCtx)).not.toThrow();
    });
  });

  // ── error handling ──

  describe("dispatch — error handling", () => {
    it("catches synchronous errors from handlers", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler: ActionHandler = () => {
        throw new Error("sync boom");
      };
      registry.register("fail", handler);

      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      expect(() => registry.dispatch("fail", baseCtx)).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"fail"'),
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });

    it("catches async rejection from handlers", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler: ActionHandler = async () => {
        throw new Error("async boom");
      };
      registry.register("asyncFail", handler);

      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      registry.dispatch("asyncFail", baseCtx);

      // Let the microtask queue flush
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"asyncFail"'),
          expect.any(Error),
        );
      });

      errorSpy.mockRestore();
    });
  });

  // ── duplicate registration ──

  describe("duplicate registration", () => {
    it("overwrites the handler", () => {
      const first = vi.fn();
      const second = vi.fn();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      registry.register("dup", first);
      registry.register("dup", second);
      warnSpy.mockRestore();

      const baseCtx = { store: {} as ActionContext["store"], send: vi.fn() };
      registry.dispatch("dup", baseCtx);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalled();
    });
  });
});
