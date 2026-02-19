import { useEffect, useMemo, useCallback } from "react";

import { useRoomStore } from "../stores/room.store";
import { useMobileDetect, useRoomWebSocket } from "../hooks";
import { fetchAgent, fetchAgentAuthenticated } from "../api";
import { useLabels } from "@/i18n";

import { JoinModal } from "./modals/join-modal";
import { TutorialModal } from "./modals/tutorial-modal";
import { TestModal } from "./modals/test-modal";
import { ConclusionModal } from "./modals/conclusion-modal";
import { VideoRecorder } from "./controls/video-recorder";
import { DesktopRoomLayout } from "./layouts/desktop-room-layout";
import { MobileRoomLayout } from "./layouts/mobile/mobile-room-layout";
import { ErrorToast, WarningToast } from "./display/toasts";

/* ─────────────────────────────────────────────
 * RoomPage
 * ─────────────────────────────────────────────
 * Top-level orchestrator for the room feature.
 * Owns: agent fetching, WS lifecycle, layout pick.
 * Does NOT drill store state — children read it
 * directly via useRoomStore().
 * ───────────────────────────────────────────── */

interface RoomPageProps {
  roomId: string;
  isTestMode?: boolean;
}

export function RoomPage({ roomId, isTestMode = false }: RoomPageProps) {
  const isMobile = useMobileDetect();
  const { room: r } = useLabels();

  const {
    agent,
    isAgentLoading,
    sessionAuth,
    tutorialCompleted,
    showTutorial,
    showTestModal,
    showErrorToast,
    showWarningToast,
    isConversationComplete,
    assessment,
    setAgent,
    setSessionAuth,
    completeTutorial,
    hideError,
    hideWarning,
  } = useRoomStore();

  const { setAgentLoading } = useRoomStore();

  /* ── Fetch agent on mount ── */
  useEffect(() => {
    const fetch = isTestMode ? fetchAgentAuthenticated : fetchAgent;
    void fetch(roomId)
      .then(setAgent)
      .catch((err: unknown) => {
        console.error("Failed to fetch agent:", err);
        setAgentLoading(false);
      });
  }, [roomId, isTestMode, setAgent, setAgentLoading]);

  /* ── WebSocket (only when session is authenticated + tutorial done) ── */
  const wsParams = useMemo(() => {
    if (!sessionAuth || !agent || !tutorialCompleted) return null;
    return { accessToken: sessionAuth.accessToken };
  }, [sessionAuth, agent, tutorialCompleted]);

  const { handlePressStart, handlePressEnd, submitData } =
    useRoomWebSocket(wsParams);

  /* ── Assessment submission — direct event handler, no effect ── */
  const handleTestSubmit = useCallback(
    (answer: string) => {
      submitData("assessment", { answer });
      useRoomStore.getState().closeTestModal();
    },
    [submitData],
  );

  /* ── Loading state ── */
  if (isAgentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="ag-empty max-w-md w-full">
          <div className="ag-empty-orb" />
          <div className="ag-empty-ring">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
          </div>
          <div className="ag-empty-text">
            <p className="ag-empty-title">{r.agentNotFound}</p>
            <p className="ag-empty-sub">{r.agentNotFoundSub}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!sessionAuth && (
        <JoinModal
          agent={agent}
          roomId={roomId}
          isTestMode={isTestMode}
          onJoinSuccess={setSessionAuth}
        />
      )}

      <TutorialModal isOpen={showTutorial} onComplete={completeTutorial} />

      {assessment && (
        <TestModal
          isOpen={showTestModal}
          question={assessment.testContent}
          timeLimit={assessment.durationSeconds}
          language={assessment.language}
          onSubmit={handleTestSubmit}
          onClose={() => useRoomStore.getState().closeTestModal()}
        />
      )}

      <ConclusionModal isOpen={isConversationComplete} />

      <ErrorToast isOpen={showErrorToast} onClose={hideError} />
      <WarningToast isOpen={showWarningToast} onClose={hideWarning} />

      {sessionAuth && tutorialCompleted && (
        <>
          {agent.features.videoRecording && <VideoRecorder />}

          {isMobile ? (
            <MobileRoomLayout
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
            />
          ) : (
            <DesktopRoomLayout
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
            />
          )}
        </>
      )}
    </div>
  );
}
