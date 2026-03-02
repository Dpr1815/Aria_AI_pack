import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JoinModal } from "./join-modal";
import { createMockAgent, createMockSessionAuth } from "../../__tests__/helpers";

vi.mock("@/i18n", async () => {
  const { en } = await import("@/i18n/locales/en");
  return { useLabels: () => en };
});

vi.mock("../../api", () => ({
  joinSession: vi.fn(),
  testJoinSession: vi.fn(),
}));

import { joinSession, testJoinSession } from "../../api";

const mockJoin = joinSession as ReturnType<typeof vi.fn>;
const mockTestJoin = testJoinSession as ReturnType<typeof vi.fn>;

describe("JoinModal", () => {
  const defaultProps = {
    agent: createMockAgent(),
    roomId: "agent-1",
    onJoinSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──

  it("displays agent label in the header", () => {
    render(<JoinModal {...defaultProps} />);
    expect(screen.getByText("Test Agent")).toBeInTheDocument();
  });

  it("renders name and email input fields", () => {
    render(<JoinModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email address")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<JoinModal {...defaultProps} />);
    expect(screen.getByText("Start Interview")).toBeInTheDocument();
  });

  it("shows draft mode badge when agent is inactive", () => {
    render(
      <JoinModal {...defaultProps} agent={createMockAgent({ status: "inactive" })} />,
    );
    expect(screen.getByText("Draft Mode")).toBeInTheDocument();
  });

  it("disables submit button when agent is inactive and not in test mode", () => {
    render(
      <JoinModal {...defaultProps} agent={createMockAgent({ status: "inactive" })} />,
    );
    expect(screen.getByText("Start Interview").closest("button")).toBeDisabled();
  });

  it("enables submit button when agent is inactive but isTestMode is true", () => {
    render(
      <JoinModal
        {...defaultProps}
        agent={createMockAgent({ status: "inactive" })}
        isTestMode
      />,
    );
    expect(screen.getByText("Start Interview").closest("button")).not.toBeDisabled();
  });

  // ── Email validation ──

  it("shows error for email that passes native validation but fails custom regex", async () => {
    // "user@domain" passes type="email" native check but fails the custom
    // regex which requires a dot in the domain part.
    const user = userEvent.setup();
    render(<JoinModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("Enter your email address");
    await user.type(emailInput, "user@domain");
    await user.click(screen.getByText("Start Interview"));

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it("does not submit when email is empty (native required validation)", async () => {
    const user = userEvent.setup();
    render(<JoinModal {...defaultProps} />);

    // With required + type="email", native validation blocks submission
    await user.click(screen.getByText("Start Interview"));

    expect(mockJoin).not.toHaveBeenCalled();
  });

  // ── Successful submission ──

  it("calls joinSession and onJoinSuccess on valid submission", async () => {
    const user = userEvent.setup();
    const auth = createMockSessionAuth();
    mockJoin.mockResolvedValue(auth);

    render(<JoinModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("Enter your email address"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Enter your full name"), "Jane Doe");
    await user.click(screen.getByText("Start Interview"));

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith({
        agentId: "agent-1",
        email: "test@example.com",
        name: "Jane Doe",
      });
    });

    expect(defaultProps.onJoinSuccess).toHaveBeenCalledWith(auth);
  });

  it("sends name as undefined when name field is empty", async () => {
    const user = userEvent.setup();
    mockJoin.mockResolvedValue(createMockSessionAuth());

    render(<JoinModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("Enter your email address"), "test@example.com");
    await user.click(screen.getByText("Start Interview"));

    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith({
        agentId: "agent-1",
        email: "test@example.com",
        name: undefined,
      });
    });
  });

  // ── Error handling ──

  it("shows error message on API failure", async () => {
    const user = userEvent.setup();
    mockJoin.mockRejectedValue(new Error("Network error"));

    render(<JoinModal {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("Enter your email address"), "test@example.com");
    await user.click(screen.getByText("Start Interview"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  // ── Test mode ──

  it("calls testJoinSession instead of joinSession in test mode", async () => {
    const user = userEvent.setup();
    const auth = createMockSessionAuth();
    mockTestJoin.mockResolvedValue(auth);

    render(<JoinModal {...defaultProps} isTestMode />);

    await user.type(screen.getByPlaceholderText("Enter your email address"), "owner@test.com");
    await user.click(screen.getByText("Start Interview"));

    await waitFor(() => {
      expect(mockTestJoin).toHaveBeenCalled();
      expect(mockJoin).not.toHaveBeenCalled();
    });
  });
});
