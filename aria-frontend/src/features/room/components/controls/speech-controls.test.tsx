import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeechControls } from "./speech-controls";

vi.mock("@/i18n", async () => {
  const { en } = await import("@/i18n/locales/en");
  return { useLabels: () => en };
});

vi.mock("../../stores/room.store", () => ({
  useRoomStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({ agent: { voice: { languageCode: "en-US" } } }),
  ),
}));

describe("SpeechControls", () => {
  const defaultProps = {
    isRecording: false,
    isProcessing: false,
    isLoading: false,
    isAiPlaying: false,
    disabled: false,
    onPressStart: vi.fn(),
    onPressEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Status labels ──

  it("renders 'Tap to speak' in idle state", () => {
    render(<SpeechControls {...defaultProps} />);
    expect(screen.getByText("Tap to speak")).toBeInTheDocument();
  });

  it("renders 'Tap to stop' when recording", () => {
    render(<SpeechControls {...defaultProps} isRecording />);
    expect(screen.getByText("Tap to stop")).toBeInTheDocument();
  });

  it("renders 'Processing…' when processing", () => {
    render(<SpeechControls {...defaultProps} isProcessing />);
    expect(screen.getByText("Processing…")).toBeInTheDocument();
  });

  it("renders 'AI is speaking…' when AI is playing", () => {
    render(<SpeechControls {...defaultProps} isAiPlaying />);
    expect(screen.getByText("AI is speaking…")).toBeInTheDocument();
  });

  // ── Interactions ──

  it("calls onPressStart when clicked in idle state", async () => {
    const user = userEvent.setup();
    render(<SpeechControls {...defaultProps} />);

    await user.click(screen.getByRole("button"));
    expect(defaultProps.onPressStart).toHaveBeenCalledTimes(1);
    expect(defaultProps.onPressEnd).not.toHaveBeenCalled();
  });

  it("calls onPressEnd when clicked while recording", async () => {
    const user = userEvent.setup();
    render(<SpeechControls {...defaultProps} isRecording />);

    await user.click(screen.getByRole("button"));
    expect(defaultProps.onPressEnd).toHaveBeenCalledTimes(1);
    expect(defaultProps.onPressStart).not.toHaveBeenCalled();
  });

  it("does not call callbacks when disabled", async () => {
    const user = userEvent.setup();
    render(<SpeechControls {...defaultProps} disabled />);

    // Button should be disabled, click should do nothing
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);
    expect(defaultProps.onPressStart).not.toHaveBeenCalled();
  });

  // ── Pulse ring ──

  it("renders pulse ring only when recording", () => {
    const { container, rerender } = render(<SpeechControls {...defaultProps} />);
    expect(container.querySelector(".animate-ping")).toBeNull();

    rerender(<SpeechControls {...defaultProps} isRecording />);
    expect(container.querySelector(".animate-ping")).toBeInTheDocument();
  });
});
