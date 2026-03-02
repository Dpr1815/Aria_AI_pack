import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationDialog } from "./confirmation-dialog";

vi.mock("@/i18n", async () => {
  const { en } = await import("@/i18n/locales/en");
  return { useLabels: () => en };
});

describe("ConfirmationDialog", () => {
  const defaultProps = {
    isOpen: true,
    locale: "en-US",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmationDialog {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and message when open", () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText("Confirm Report Creation")).toBeInTheDocument();
    expect(
      screen.getByText(/Create report now/),
    ).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);

    await user.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    render(<ConfirmationDialog {...defaultProps} />);

    await user.click(screen.getByText("Confirm Submit"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });
});
