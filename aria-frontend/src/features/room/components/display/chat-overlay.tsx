import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { ChatMessage } from "../../types";

interface ChatWindowProps {
  messages: ChatMessage[];
}

export function ChatWindow({ messages }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-3">
      {messages.map((msg, i) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={i}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-card p-3 shadow-card backdrop-blur-md ${
                isUser ? "chat-bubble-user" : "chat-bubble-assistant"
              }`}
            >
              <p className="text-sm font-medium leading-relaxed text-text">
                {msg.message}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

interface ChatOverlayProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
}

export function ChatOverlay({ messages, isOpen, onClose }: ChatOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 flex flex-col bg-background/50 p-4 backdrop-blur-sm">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatWindow messages={messages} />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-surface-overlay/80 p-2 text-text-secondary transition-colors duration-200 hover:bg-surface-modal hover:text-text"
      >
        <X size={20} />
      </button>
    </div>
  );
}
