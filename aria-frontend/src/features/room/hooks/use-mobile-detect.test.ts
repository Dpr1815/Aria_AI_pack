import { renderHook, act } from "@testing-library/react";
import { useMobileDetect } from "./use-mobile-detect";

type ChangeListener = (e: MediaQueryListEvent) => void;

function createMockMatchMedia(initialMatches: boolean) {
  const listeners: ChangeListener[] = [];

  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
  };

  const fire = (newMatches: boolean) => {
    mql.matches = newMatches;
    listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
  };

  return { mql, fire, listeners };
}

describe("useMobileDetect", () => {
  let mock: ReturnType<typeof createMockMatchMedia>;

  beforeEach(() => {
    mock = createMockMatchMedia(false);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue(mock.mql),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when viewport > 768px", () => {
    const { result } = renderHook(() => useMobileDetect());
    expect(result.current).toBe(false);
  });

  it("returns true when viewport <= 768px", () => {
    mock = createMockMatchMedia(true);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mock.mql));

    const { result } = renderHook(() => useMobileDetect());
    expect(result.current).toBe(true);
  });

  it("updates when viewport changes", () => {
    const { result } = renderHook(() => useMobileDetect());
    expect(result.current).toBe(false);

    act(() => mock.fire(true));
    expect(result.current).toBe(true);

    act(() => mock.fire(false));
    expect(result.current).toBe(false);
  });

  it("removes event listener on unmount", () => {
    const { unmount } = renderHook(() => useMobileDetect());
    expect(mock.listeners).toHaveLength(1);

    unmount();
    expect(mock.mql.removeEventListener).toHaveBeenCalled();
    expect(mock.listeners).toHaveLength(0);
  });
});
