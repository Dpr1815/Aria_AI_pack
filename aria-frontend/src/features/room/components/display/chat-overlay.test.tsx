import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWindow, ChatOverlay } from "./chat-overlay";
import { createMockChatMessage } from "../../__tests__/helpers";

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("ChatWindow", () => {
  it("renders each message text", () => {
    const messages = [
      createMockChatMessage({ message: "Hello from assistant" }),
      createMockChatMessage({ sender: "user", message: "Hello from user" }),
    ];

    render(<ChatWindow messages={messages} />);

    expect(screen.getByText("Hello from assistant")).toBeInTheDocument();
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  it("applies user styling class for sender='user'", () => {
    const messages = [createMockChatMessage({ sender: "user", message: "User msg" })];
    render(<ChatWindow messages={messages} />);

    const bubble = screen.getByText("User msg").closest(".chat-bubble-user");
    expect(bubble).toBeInTheDocument();
  });

  it("applies assistant styling class for sender='assistant'", () => {
    const messages = [createMockChatMessage({ sender: "assistant", message: "Bot msg" })];
    render(<ChatWindow messages={messages} />);

    const bubble = screen.getByText("Bot msg").closest(".chat-bubble-assistant");
    expect(bubble).toBeInTheDocument();
  });

  it("calls scrollIntoView when messages change", () => {
    const messages = [createMockChatMessage({ message: "First" })];
    const { rerender } = render(<ChatWindow messages={messages} />);

    const scrollFn = HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    scrollFn.mockClear();

    const updated = [...messages, createMockChatMessage({ message: "Second" })];
    rerender(<ChatWindow messages={updated} />);

    expect(scrollFn).toHaveBeenCalled();
  });

  it("renders empty when no messages", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    // Should still render the container div but no message bubbles
    expect(container.querySelectorAll(".chat-bubble-user, .chat-bubble-assistant")).toHaveLength(0);
  });
});

describe("ChatOverlay", () => {
  const defaultProps = {
    messages: [createMockChatMessage({ message: "Test message" })],
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ChatOverlay {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders messages and close button when open", () => {
    render(<ChatOverlay {...defaultProps} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
    // Close button should exist (the X icon button)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChatOverlay {...defaultProps} />);

    await user.click(screen.getByRole("button"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
