import { RoomWebSocket } from "./room.websocket";
import type { WsMessageHandler, WsStatusHandler } from "./room.websocket";

// ── MockWebSocket ──

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = MockWebSocket.CONNECTING;
  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(event: unknown) {
    this.onerror?.(event);
  }
}

// Assign mock WS constants for readyState checks in source
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

vi.stubGlobal("WebSocket", MockWebSocket);

describe("RoomWebSocket", () => {
  let onMessage: WsMessageHandler;
  let onStatus: WsStatusHandler;
  let ws: RoomWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    onMessage = vi.fn();
    onStatus = vi.fn();
    ws = new RoomWebSocket(onMessage, onStatus);
  });

  afterEach(() => {
    ws.disconnect();
    vi.useRealTimers();
  });

  function latestSocket(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  // ── connect() ──

  describe("connect()", () => {
    it("creates a WebSocket connection", () => {
      ws.connect();
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it("calls onStatus('connected') when socket opens", () => {
      ws.connect();
      latestSocket().simulateOpen();
      expect(onStatus).toHaveBeenCalledWith("connected");
    });
  });

  // ── onmessage ──

  describe("onmessage", () => {
    it("parses JSON and calls onMessage handler", () => {
      ws.connect();
      latestSocket().simulateOpen();

      const msg = { type: "sessionReady", sessionId: "s1" };
      latestSocket().simulateMessage(msg);

      expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it("logs error for malformed JSON without crashing", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      ws.connect();
      latestSocket().simulateOpen();

      // Send invalid JSON directly
      latestSocket().onmessage?.({ data: "not-json{{{" });

      expect(errorSpy).toHaveBeenCalled();
      expect(onMessage).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ── send() ──

  describe("send()", () => {
    it("serializes message to JSON when socket is open", () => {
      ws.connect();
      latestSocket().simulateOpen();

      ws.send({ type: "init", accessToken: "tok" });

      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "init", accessToken: "tok" }),
      );
    });

    it("warns when socket is not open", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      ws.connect();
      // Socket is still CONNECTING, not open

      ws.send({ type: "startRecording" });

      expect(latestSocket().send).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── isOpen ──

  describe("isOpen", () => {
    it("returns true when readyState is OPEN", () => {
      ws.connect();
      latestSocket().simulateOpen();
      expect(ws.isOpen).toBe(true);
    });

    it("returns false when socket is not open", () => {
      expect(ws.isOpen).toBe(false);
      ws.connect();
      expect(ws.isOpen).toBe(false);
    });
  });

  // ── convenience senders ──

  describe("convenience senders", () => {
    beforeEach(() => {
      ws.connect();
      latestSocket().simulateOpen();
    });

    it("sendInit sends init message", () => {
      ws.sendInit("my-token");
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "init", accessToken: "my-token" }),
      );
    });

    it("sendStartRecording sends startRecording message", () => {
      ws.sendStartRecording();
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "startRecording" }),
      );
    });

    it("sendAudioChunk sends audio message", () => {
      ws.sendAudioChunk("base64data");
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "audio", data: "base64data" }),
      );
    });

    it("sendStopRecording sends stopRecording message with latency", () => {
      ws.sendStopRecording(150);
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "stopRecording", latency: 150 }),
      );
    });

    it("sendSubmitData sends submitData message", () => {
      ws.sendSubmitData("assessment", { answer: "42" }, 100);
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "submitData", dataType: "assessment", payload: { answer: "42" }, latency: 100 }),
      );
    });

    it("sendAction sends action message", () => {
      ws.sendAction({ type: "openAssessment" });
      expect(latestSocket().send).toHaveBeenCalledWith(
        JSON.stringify({ type: "action", action: { type: "openAssessment" } }),
      );
    });
  });

  // ── disconnect() ──

  describe("disconnect()", () => {
    it("closes socket and does NOT trigger reconnect", () => {
      ws.connect();
      latestSocket().simulateOpen();
      const socket = latestSocket();

      ws.disconnect();
      // Simulate the close event that the browser would fire
      socket.simulateClose();

      expect(socket.close).toHaveBeenCalled();
      expect(onStatus).toHaveBeenCalledWith("disconnected");

      // Advance time — no reconnect should happen
      vi.advanceTimersByTime(60_000);
      expect(MockWebSocket.instances).toHaveLength(1); // No new sockets
    });
  });

  // ── reconnection ──

  describe("reconnection", () => {
    it("schedules reconnect on unintentional close", () => {
      ws.connect();
      latestSocket().simulateOpen();
      latestSocket().simulateClose();

      expect(onStatus).toHaveBeenCalledWith("reconnecting");
    });

    it("uses exponential backoff", () => {
      ws.connect();
      latestSocket().simulateOpen();

      // Close #1 → delay = 1000ms (1000 * 2^0)
      latestSocket().simulateClose();
      expect(MockWebSocket.instances).toHaveLength(1);
      vi.advanceTimersByTime(1000);
      expect(MockWebSocket.instances).toHaveLength(2);

      // Close #2 → delay = 2000ms (1000 * 2^1)
      latestSocket().simulateClose();
      vi.advanceTimersByTime(1999);
      expect(MockWebSocket.instances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(3);

      // Close #3 → delay = 4000ms (1000 * 2^2)
      latestSocket().simulateClose();
      vi.advanceTimersByTime(3999);
      expect(MockWebSocket.instances).toHaveLength(3);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(4);
    });

    it("caps delay at 30 seconds", () => {
      ws.connect();
      latestSocket().simulateOpen();

      // Burn through several reconnects to reach cap
      for (let i = 0; i < 6; i++) {
        latestSocket().simulateClose();
        vi.advanceTimersByTime(30_000);
      }

      // 7th close → should still cap at 30s
      const countBefore = MockWebSocket.instances.length;
      latestSocket().simulateClose();
      vi.advanceTimersByTime(29_999);
      expect(MockWebSocket.instances).toHaveLength(countBefore);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(countBefore + 1);
    });

    it("stops reconnecting after 10 attempts", () => {
      ws.connect();
      latestSocket().simulateOpen();

      // Trigger 10 unintentional closes + advance through all timers
      for (let i = 0; i < 10; i++) {
        latestSocket().simulateClose();
        vi.advanceTimersByTime(30_000);
      }

      // 11th close — should give up
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      latestSocket().simulateClose();
      expect(onStatus).toHaveBeenCalledWith("disconnected");

      // No more reconnect
      const countBefore = MockWebSocket.instances.length;
      vi.advanceTimersByTime(60_000);
      expect(MockWebSocket.instances).toHaveLength(countBefore);

      errorSpy.mockRestore();
    });

    it("resets attempt counter when connection succeeds after reconnect", () => {
      ws.connect();
      latestSocket().simulateOpen();

      // Close and reconnect
      latestSocket().simulateClose();
      vi.advanceTimersByTime(1000);
      latestSocket().simulateOpen(); // Success!

      // Next close should use first-attempt delay again (1000ms)
      latestSocket().simulateClose();
      const countBefore = MockWebSocket.instances.length;
      vi.advanceTimersByTime(1000);
      expect(MockWebSocket.instances).toHaveLength(countBefore + 1);
    });
  });
});
