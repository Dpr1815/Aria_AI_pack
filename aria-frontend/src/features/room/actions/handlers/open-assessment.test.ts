import { openAssessment } from "./open-assessment";
import type { ActionContext } from "../action-registry";
import { createMockAssessmentConfig } from "../../__tests__/helpers";

function createMockContext(
  payload?: Record<string, unknown>,
): ActionContext {
  return {
    store: {
      getState: vi.fn().mockReturnValue({
        setAssessment: vi.fn(),
        openTestModal: vi.fn(),
      }),
    } as unknown as ActionContext["store"],
    payload,
    send: vi.fn(),
  };
}

describe("openAssessment handler", () => {
  it("calls setAssessment with payload.assessment and opens test modal", () => {
    const assessment = createMockAssessmentConfig();
    const ctx = createMockContext({ assessment });

    openAssessment(ctx);

    const state = (ctx.store.getState as ReturnType<typeof vi.fn>)();
    expect(state.setAssessment).toHaveBeenCalledWith(assessment);
    expect(state.openTestModal).toHaveBeenCalled();
  });

  it("opens test modal even when payload.assessment is undefined", () => {
    const ctx = createMockContext({ other: "data" });

    openAssessment(ctx);

    const state = (ctx.store.getState as ReturnType<typeof vi.fn>)();
    expect(state.setAssessment).not.toHaveBeenCalled();
    expect(state.openTestModal).toHaveBeenCalled();
  });

  it("opens test modal even when payload is undefined", () => {
    const ctx = createMockContext(undefined);

    openAssessment(ctx);

    const state = (ctx.store.getState as ReturnType<typeof vi.fn>)();
    expect(state.setAssessment).not.toHaveBeenCalled();
    expect(state.openTestModal).toHaveBeenCalled();
  });
});
