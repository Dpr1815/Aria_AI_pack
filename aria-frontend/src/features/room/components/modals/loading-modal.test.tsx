import { render, screen, act } from "@testing-library/react";
import { LoadingModal } from "./loading-modal";

vi.mock("@/i18n", async () => {
  const { en } = await import("@/i18n/locales/en");
  return { useLabels: () => en };
});

describe("LoadingModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the first loading message initially", () => {
    render(<LoadingModal />);
    expect(screen.getByText("Analyzing interview data...")).toBeInTheDocument();
  });

  it("rotates to the next message after 3 seconds", () => {
    render(<LoadingModal />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Generating insights...")).toBeInTheDocument();
  });

  it("cycles back to the first message after all messages shown", () => {
    render(<LoadingModal />);

    // 5 messages × 3s = 15s to cycle through all
    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(screen.getByText("Analyzing interview data...")).toBeInTheDocument();
  });

  it("renders a spinner SVG", () => {
    const { container } = render(<LoadingModal />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
