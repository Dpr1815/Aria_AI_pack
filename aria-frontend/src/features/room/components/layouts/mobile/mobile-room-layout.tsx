import { useState, useEffect, useRef } from "react";
import { ChevronDown, MessageCircle, Users } from "lucide-react";
import { DraggableVideo } from "./draggable-video";
import { PresentationViewer } from "../../display/presentation-viewer";
import { AvatarPresentation } from "../../display/avatar-presentation";
import { SpeechControls } from "../../controls/speech-controls";
import { ChatWindow } from "../../display/chat-overlay";
import { useRoomStore } from "../../../stores/room.store";
import { useLabels } from "@/i18n";

/* ─────────────────────────────────────────────
 * MobileRoomLayout
 * ─────────────────────────────────────────────
 * Full-screen immersive layout for mobile.
 * Reads display state from the store directly.
 * ───────────────────────────────────────────── */

interface MobileRoomLayoutProps {
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function MobileRoomLayout({
  onPressStart,
  onPressEnd,
}: MobileRoomLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const {
    agent,
    sessionAuth,
    currentSlide,
    chatHistory,
    isRecording,
    isProcessing,
    isTranscriptLoading,
    isAiPlaying,
  } = useRoomStore();

  if (!agent || !sessionAuth) return null;

  const locale = agent.voice.languageCode ?? "en-US";
  const { room: t } = useLabels(locale);

  const participantName =
    sessionAuth.participant.name ?? sessionAuth.participant.email;

  const prevChatLenRef = useRef(chatHistory.length);
  useEffect(() => {
    const newCount = chatHistory.length - prevChatLenRef.current;
    if (newCount > 0 && !isChatOpen) {
      setUnread((u) => u + newCount);
    }
    prevChatLenRef.current = chatHistory.length;
  }, [chatHistory.length, isChatOpen]);

  const handleToggleChat = () => {
    setIsChatOpen((v) => !v);
    if (!isChatOpen) setUnread(0);
  };

  return (
    <div
      className="flex h-screen w-screen flex-col text-text"
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-overlay px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-button bg-primary-light p-1.5">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-lg font-bold text-text">
            {agent.label}
          </h1>
        </div>
      </div>

      {/* Presentation area */}
      {agent.render.mode === "presentation" && agent.render.presentation && (
        <div className="relative flex-grow overflow-hidden">
          <PresentationViewer
            presentationId={agent.render.presentation.link}
            currentSlide={currentSlide}
            isMobile
          />
        </div>
      )}

      {/* Avatar area (when not in presentation mode) */}
      {agent.render.mode === "avatar" && (
        <div className="relative flex flex-grow items-center justify-center overflow-hidden">
          <AvatarPresentation isMobile />
        </div>
      )}

      {/* Draggable video PiP */}
      <DraggableVideo userName={participantName} />

      {/* Footer controls */}
      <div className="fixed bottom-5 left-0 right-0 z-[9996]">
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/50 backdrop-blur-md" />
        <div className="relative flex h-20 items-center justify-between p-4">
          <div className="flex-1" />
          <div className="flex flex-1 justify-center">
            <SpeechControls
              isRecording={isRecording}
              isProcessing={isProcessing}
              isLoading={isTranscriptLoading}
              isAiPlaying={isAiPlaying}
              disabled={false}
              onPressStart={onPressStart}
              onPressEnd={onPressEnd}
            />
          </div>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={handleToggleChat}
              className="relative rounded-full bg-primary p-3 text-text-inverse shadow-card transition-all hover:bg-primary-hover hover:shadow-glow"
            >
              {isChatOpen ? (
                <ChevronDown size={24} />
              ) : (
                <MessageCircle size={24} />
              )}
              {unread > 0 && !isChatOpen && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-text">
                  {unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chat fullscreen overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 bottom-20 z-[9997] bg-surface-raised">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border bg-surface-overlay p-4">
              <h2 className="font-semibold text-text">{t.room.chat}</h2>
              <button
                type="button"
                onClick={handleToggleChat}
                className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text"
              >
                <ChevronDown size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ChatWindow messages={chatHistory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
