import {
  fetchAgent,
  fetchAgentAuthenticated,
  joinSession,
  testJoinSession,
  uploadVideo,
  getConversationMessages,
} from "./room.api";
import { createMockAgent, createMockSessionAuth } from "../__tests__/helpers";

vi.mock("@/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api-client";

const mockGet = api.get as ReturnType<typeof vi.fn>;
const mockPost = api.post as ReturnType<typeof vi.fn>;

describe("room REST API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAgent", () => {
    it("calls GET /api/agents/:id/public and returns unwrapped data", async () => {
      const agent = createMockAgent();
      mockGet.mockResolvedValue({ success: true, data: agent });

      const result = await fetchAgent("agent-1");

      expect(mockGet).toHaveBeenCalledWith("/api/agents/agent-1/public");
      expect(result).toEqual(agent);
    });
  });

  describe("fetchAgentAuthenticated", () => {
    it("calls GET /api/agents/:id and returns unwrapped data", async () => {
      const agent = createMockAgent();
      mockGet.mockResolvedValue({ success: true, data: agent });

      const result = await fetchAgentAuthenticated("agent-1");

      expect(mockGet).toHaveBeenCalledWith("/api/agents/agent-1");
      expect(result).toEqual(agent);
    });
  });

  describe("joinSession", () => {
    it("calls POST /api/sessions/join with body params and returns data", async () => {
      const auth = createMockSessionAuth();
      mockPost.mockResolvedValue({ success: true, data: auth });

      const params = { agentId: "agent-1", email: "test@example.com", name: "Test" };
      const result = await joinSession(params);

      expect(mockPost).toHaveBeenCalledWith("/api/sessions/join", { body: params });
      expect(result).toEqual(auth);
    });
  });

  describe("testJoinSession", () => {
    it("calls POST /api/sessions/test with body params and returns data", async () => {
      const auth = createMockSessionAuth();
      mockPost.mockResolvedValue({ success: true, data: auth });

      const params = { agentId: "agent-1", email: "owner@test.com" };
      const result = await testJoinSession(params);

      expect(mockPost).toHaveBeenCalledWith("/api/sessions/test", { body: params });
      expect(result).toEqual(auth);
    });
  });

  describe("uploadVideo", () => {
    it("builds FormData and sends with Authorization header", async () => {
      mockPost.mockResolvedValue({ success: true, data: { success: true, url: "https://example.com/video.webm" } });

      const blob = new Blob(["video-data"], { type: "video/webm" });
      const result = await uploadVideo(blob, {
        sessionId: "session-1",
        stepKey: "intro",
        accessToken: "tok-123",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/api/sessions/session-1/upload-video",
        expect.objectContaining({
          body: expect.any(FormData),
          headers: { Authorization: "Bearer tok-123" },
        }),
      );

      // Verify FormData contents
      const formData = mockPost.mock.calls[0][1].body as FormData;
      expect(formData.get("step")).toBe("intro");

      const file = formData.get("video") as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toMatch(/^session-1_intro_\d+\.webm$/);

      expect(result).toEqual({ success: true, url: "https://example.com/video.webm" });
    });
  });

  describe("getConversationMessages", () => {
    it("calls GET with Authorization header and returns data", async () => {
      const messages = [
        { sequence: 1, stepKey: "intro", role: "assistant", content: "Hello", createdAt: "2026-01-01" },
      ];
      mockGet.mockResolvedValue({ success: true, data: messages });

      const result = await getConversationMessages("session-1", "tok-123");

      expect(mockGet).toHaveBeenCalledWith(
        "/api/sessions/session-1/conversation/messages",
        { headers: { Authorization: "Bearer tok-123" } },
      );
      expect(result).toEqual(messages);
    });
  });
});
