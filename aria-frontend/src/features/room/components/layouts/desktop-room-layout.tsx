import { useState } from "react";
import { ChevronDown, MessageCircle, Users } from "lucide-react";
import { PresentationViewer } from "../display/presentation-viewer";
import { AvatarPresentation } from "../display/avatar-presentation";
import { VideoPreview } from "../display/video-preview";
import { SpeechControls } from "../controls/speech-controls";
import { ChatOverlay } from "../display/chat-overlay";
import { useRoomStore } from "../../stores/room.store";

/* ─────────────────────────────────────────────
 * DesktopRoomLayout
 * ─────────────────────────────────────────────
 * Full-screen layout for desktop viewports.
 * Reads all display state from the store;
 * only receives WS press handlers as props.
 *
 * Layout contract: fills exactly 100vh with no
 * scroll. Every flex child uses min-h-0 / min-w-0
 * to allow shrinking inside the viewport.
 * ───────────────────────────────────────────── */

interface DesktopRoomLayoutProps {
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function DesktopRoomLayout({
  onPressStart,
  onPressEnd,
}: DesktopRoomLayoutProps) {
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

  const participantName =
    sessionAuth.participant.name ?? sessionAuth.participant.email;

  const handleToggleChat = () => {
    setIsChatOpen((v) => !v);
    if (!isChatOpen) setUnread(0);
  };

  const hasPresentation =
    agent.render.mode === "presentation" && agent.render.presentation;
  const hasAvatar = agent.render.mode === "avatar";

  return (
    <div className="fixed inset-0 overflow-hidden p-4">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-card border border-border-strong bg-surface-modal shadow-card">
        {/* ── Top bar ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface-overlay px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="rounded-button bg-primary-light p-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-text">
              {agent.label}
            </h1>
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Left: Presentation */}
          {hasPresentation && (
            <div className="flex min-h-0 w-full flex-col border-r border-border md:w-2/3">
              <div className="min-h-0 flex-1 overflow-auto p-6">
                <PresentationViewer
                  presentationId={agent.render.presentation!.link}
                  currentSlide={currentSlide}
                />
              </div>
            </div>
          )}

          {/* Left: Avatar */}
          {hasAvatar && (
            <div className="flex min-h-0 w-full flex-col border-r border-border md:w-2/3">
              <div className="min-h-0 flex-1 overflow-hidden">
                <AvatarPresentation />
              </div>
            </div>
          )}

          {/* Right: Video + controls */}
          <div
            className={`flex min-h-0 flex-col bg-surface ${
              hasPresentation || hasAvatar ? "w-full md:w-1/3" : "w-full"
            }`}
          >
            {/* Video area */}
            <div className="relative min-h-0 flex-1 p-4">
              <div className="relative h-full w-full overflow-hidden rounded-card border border-border bg-surface-overlay shadow-card">
                <VideoPreview userName={participantName} />
                <ChatOverlay
                  messages={chatHistory}
                  isOpen={isChatOpen}
                  onClose={handleToggleChat}
                />
              </div>
            </div>

            {/* Controls bar */}
            <div className="flex flex-shrink-0 items-center justify-center border-t border-border bg-surface-raised px-4 py-4">
              <SpeechControls
                isRecording={isRecording}
                isProcessing={isProcessing}
                isLoading={isTranscriptLoading}
                isAiPlaying={isAiPlaying}
                disabled={false}
                onPressStart={onPressStart}
                onPressEnd={onPressEnd}
              />

              {/* Chat toggle — anchored right within the controls bar */}
              <button
                type="button"
                onClick={handleToggleChat}
                className="absolute right-8 rounded-full bg-primary p-3 text-text-inverse shadow-card transition-colors duration-200 hover:bg-primary-hover hover:shadow-glow"
              >
                {isChatOpen ? (
                  <ChevronDown size={20} />
                ) : (
                  <MessageCircle size={20} />
                )}
                {unread > 0 && !isChatOpen && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs font-bold text-text-inverse">
                    {unread}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
