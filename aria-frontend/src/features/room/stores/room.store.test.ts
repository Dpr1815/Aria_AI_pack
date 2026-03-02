import { useRoomStore } from "./room.store";
import {
  createMockAgent,
  createMockSessionAuth,
  createMockChatMessage,
  createMockAssessmentConfig,
} from "../__tests__/helpers";

describe("useRoomStore", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  // ── Initial state ──

  describe("initial state", () => {
    it("has null agent and isAgentLoading true", () => {
      const s = useRoomStore.getState();
      expect(s.agent).toBeNull();
      expect(s.isAgentLoading).toBe(true);
    });

    it("has null sessionAuth", () => {
      expect(useRoomStore.getState().sessionAuth).toBeNull();
    });

    it("has empty chatHistory", () => {
      expect(useRoomStore.getState().chatHistory).toEqual([]);
    });

    it("has default audio/recording flags off", () => {
      const s = useRoomStore.getState();
      expect(s.isRecording).toBe(false);
      expect(s.isProcessing).toBe(false);
      expect(s.isTranscriptLoading).toBe(false);
      expect(s.isAiPlaying).toBe(false);
      expect(s.lastAiAudioEndTime).toBeNull();
      expect(s.activeStage).toBeNull();
    });

    it("has tutorial defaults", () => {
      const s = useRoomStore.getState();
      expect(s.showTutorial).toBe(false);
      expect(s.tutorialCompleted).toBe(false);
    });

    it("has assessment defaults", () => {
      const s = useRoomStore.getState();
      expect(s.assessment).toBeNull();
      expect(s.showTestModal).toBe(false);
      expect(s.timeLeft).toBe(0);
    });

    it("has conversation progression defaults", () => {
      const s = useRoomStore.getState();
      expect(s.currentStep).toBe("");
      expect(s.currentSlide).toBe(1);
      expect(s.stepProgress).toBe(0);
      expect(s.isConversationComplete).toBe(false);
    });

    it("has toast defaults", () => {
      const s = useRoomStore.getState();
      expect(s.showErrorToast).toBe(false);
      expect(s.showWarningToast).toBe(false);
    });
  });

  // ── setAgent ──

  describe("setAgent", () => {
    it("sets agent and marks isAgentLoading false", () => {
      const agent = createMockAgent();
      useRoomStore.getState().setAgent(agent);

      const s = useRoomStore.getState();
      expect(s.agent).toEqual(agent);
      expect(s.isAgentLoading).toBe(false);
    });

    it("initializes assessment from agent.assessment when present", () => {
      const assessment = createMockAssessmentConfig();
      const agent = createMockAgent({ assessment });
      useRoomStore.getState().setAgent(agent);

      expect(useRoomStore.getState().assessment).toEqual(assessment);
    });

    it("initializes timeLeft from agent.assessment.durationSeconds", () => {
      const agent = createMockAgent({
        assessment: createMockAssessmentConfig({ durationSeconds: 600 }),
      });
      useRoomStore.getState().setAgent(agent);

      expect(useRoomStore.getState().timeLeft).toBe(600);
    });

    it("sets assessment to null when agent has no assessment", () => {
      const agent = createMockAgent({ assessment: undefined });
      useRoomStore.getState().setAgent(agent);

      expect(useRoomStore.getState().assessment).toBeNull();
      expect(useRoomStore.getState().timeLeft).toBe(0);
    });
  });

  // ── setSessionAuth ──

  describe("setSessionAuth", () => {
    it("stores sessionAuth object", () => {
      const auth = createMockSessionAuth();
      useRoomStore.getState().setSessionAuth(auth);

      expect(useRoomStore.getState().sessionAuth).toEqual(auth);
    });

    it("sets currentStep from auth.session.currentStep", () => {
      const auth = createMockSessionAuth({
        session: { _id: "s1", agentId: "a1", participantId: "p1", status: "active", currentStep: "work", data: {} },
      });
      useRoomStore.getState().setSessionAuth(auth);

      expect(useRoomStore.getState().currentStep).toBe("work");
    });

    it("sets showTutorial=true and tutorialCompleted=false for new session", () => {
      const auth = createMockSessionAuth({ isResumed: false });
      useRoomStore.getState().setSessionAuth(auth);

      const s = useRoomStore.getState();
      expect(s.showTutorial).toBe(true);
      expect(s.tutorialCompleted).toBe(false);
    });

    it("sets showTutorial=false and tutorialCompleted=true for resumed session", () => {
      const auth = createMockSessionAuth({ isResumed: true });
      useRoomStore.getState().setSessionAuth(auth);

      const s = useRoomStore.getState();
      expect(s.showTutorial).toBe(false);
      expect(s.tutorialCompleted).toBe(true);
    });
  });

  // ── Chat ──

  describe("chat", () => {
    it("addChatMessage appends to chatHistory", () => {
      const msg1 = createMockChatMessage({ message: "Hello" });
      const msg2 = createMockChatMessage({ sender: "user", message: "Hi" });

      useRoomStore.getState().addChatMessage(msg1);
      useRoomStore.getState().addChatMessage(msg2);

      expect(useRoomStore.getState().chatHistory).toEqual([msg1, msg2]);
    });

    it("clearChat empties chatHistory", () => {
      useRoomStore.getState().addChatMessage(createMockChatMessage());
      useRoomStore.getState().clearChat();

      expect(useRoomStore.getState().chatHistory).toEqual([]);
    });
  });

  // ── Assessment ──

  describe("assessment", () => {
    it("setAssessment updates assessment and timeLeft", () => {
      const config = createMockAssessmentConfig({ durationSeconds: 900 });
      useRoomStore.getState().setAssessment(config);

      const s = useRoomStore.getState();
      expect(s.assessment).toEqual(config);
      expect(s.timeLeft).toBe(900);
    });

    it("openTestModal sets showTestModal true", () => {
      useRoomStore.getState().openTestModal();
      expect(useRoomStore.getState().showTestModal).toBe(true);
    });

    it("closeTestModal sets showTestModal false", () => {
      useRoomStore.getState().openTestModal();
      useRoomStore.getState().closeTestModal();
      expect(useRoomStore.getState().showTestModal).toBe(false);
    });

    it("setTimeLeft updates timeLeft", () => {
      useRoomStore.getState().setTimeLeft(42);
      expect(useRoomStore.getState().timeLeft).toBe(42);
    });
  });

  // ── Tutorial ──

  describe("tutorial", () => {
    it("setShowTutorial toggles tutorial visibility", () => {
      useRoomStore.getState().setShowTutorial(true);
      expect(useRoomStore.getState().showTutorial).toBe(true);

      useRoomStore.getState().setShowTutorial(false);
      expect(useRoomStore.getState().showTutorial).toBe(false);
    });

    it("completeTutorial sets showTutorial=false and tutorialCompleted=true", () => {
      useRoomStore.getState().setShowTutorial(true);
      useRoomStore.getState().completeTutorial();

      const s = useRoomStore.getState();
      expect(s.showTutorial).toBe(false);
      expect(s.tutorialCompleted).toBe(true);
    });
  });

  // ── Conversation progression ──

  describe("conversation progression", () => {
    it("setCurrentStep updates currentStep", () => {
      useRoomStore.getState().setCurrentStep("conclusion");
      expect(useRoomStore.getState().currentStep).toBe("conclusion");
    });

    it("setCurrentSlide updates currentSlide", () => {
      useRoomStore.getState().setCurrentSlide(3);
      expect(useRoomStore.getState().currentSlide).toBe(3);
    });

    it("setStepProgress updates stepProgress", () => {
      useRoomStore.getState().setStepProgress(0.75);
      expect(useRoomStore.getState().stepProgress).toBe(0.75);
    });

    it("setConversationComplete sets flag to true", () => {
      useRoomStore.getState().setConversationComplete();
      expect(useRoomStore.getState().isConversationComplete).toBe(true);
    });
  });

  // ── Audio / recording flags ──

  describe("audio/recording flags", () => {
    it("setIsRecording toggles isRecording", () => {
      useRoomStore.getState().setIsRecording(true);
      expect(useRoomStore.getState().isRecording).toBe(true);
    });

    it("setIsProcessing toggles isProcessing", () => {
      useRoomStore.getState().setIsProcessing(true);
      expect(useRoomStore.getState().isProcessing).toBe(true);
    });

    it("setIsTranscriptLoading toggles isTranscriptLoading", () => {
      useRoomStore.getState().setIsTranscriptLoading(true);
      expect(useRoomStore.getState().isTranscriptLoading).toBe(true);
    });

    it("setIsAiPlaying toggles isAiPlaying", () => {
      useRoomStore.getState().setIsAiPlaying(true);
      expect(useRoomStore.getState().isAiPlaying).toBe(true);
    });

    it("setLastAiAudioEndTime sets timestamp", () => {
      useRoomStore.getState().setLastAiAudioEndTime(12345);
      expect(useRoomStore.getState().lastAiAudioEndTime).toBe(12345);
    });

    it("setActiveStage sets the processing stage", () => {
      useRoomStore.getState().setActiveStage("llm");
      expect(useRoomStore.getState().activeStage).toBe("llm");
    });
  });

  // ── Toasts ──

  describe("toasts", () => {
    it("showError/hideError toggles showErrorToast", () => {
      useRoomStore.getState().showError();
      expect(useRoomStore.getState().showErrorToast).toBe(true);

      useRoomStore.getState().hideError();
      expect(useRoomStore.getState().showErrorToast).toBe(false);
    });

    it("showWarning/hideWarning toggles showWarningToast", () => {
      useRoomStore.getState().showWarning();
      expect(useRoomStore.getState().showWarningToast).toBe(true);

      useRoomStore.getState().hideWarning();
      expect(useRoomStore.getState().showWarningToast).toBe(false);
    });
  });

  // ── Reset ──

  describe("reset", () => {
    it("returns all state to initial values after mutations", () => {
      const { setAgent, addChatMessage, setIsRecording, showError, setCurrentStep } =
        useRoomStore.getState();

      setAgent(createMockAgent());
      addChatMessage(createMockChatMessage());
      setIsRecording(true);
      showError();
      setCurrentStep("conclusion");

      useRoomStore.getState().reset();
      const s = useRoomStore.getState();

      expect(s.agent).toBeNull();
      expect(s.isAgentLoading).toBe(true);
      expect(s.chatHistory).toEqual([]);
      expect(s.isRecording).toBe(false);
      expect(s.showErrorToast).toBe(false);
      expect(s.currentStep).toBe("");
    });
  });
});
