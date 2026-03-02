import type { WsOutboundMessage, WsInboundMessage, WsAction } from "../types";

/* ─────────────────────────────────────────────
 * Room WebSocket Service
 * ─────────────────────────────────────────────
 * Manages the WebSocket connection for a session.
 *
 * Protocol:
 *   Client → Server: init, startRecording, audio,
 *                     stopRecording, submitData, action
 *   Server → Client: sessionReady, response, audio,
 *                     lipSync, transcript, stepChanged,
 *                     conversationComplete, processingStart,
 *                     processingEnd, error
 * ───────────────────────────────────────────── */

/** Change this to your production WS endpoint */
const WS_URL: string =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://localhost:5000";

export type WsMessageHandler = (message: WsInboundMessage) => void;
export type WsStatusHandler = (
  status: "connected" | "disconnected" | "reconnecting",
) => void;

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;

export class RoomWebSocket {
  private ws: WebSocket | null = null;
  private onMessage: WsMessageHandler;
  private onStatus: WsStatusHandler;

  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onMessage: WsMessageHandler, onStatus: WsStatusHandler) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  /** Open the WebSocket connection */
  connect(): void {
    this.intentionalClose = false;
    this.openSocket();
  }

  private openSocket(): void {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.onStatus("connected");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsInboundMessage;
        this.onMessage(data);
      } catch (err) {
        console.error("[RoomWS] Failed to parse message:", err);
      }
    };

    this.ws.onerror = (event) => {
      console.error("[RoomWS] Error:", event);
    };

    this.ws.onclose = () => {
      if (this.intentionalClose) {
        this.onStatus("disconnected");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
      console.error("[RoomWS] Max reconnect attempts reached");
      this.onStatus("disconnected");
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempt++;

    console.info(
      `[RoomWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${RECONNECT_MAX_ATTEMPTS})`,
    );
    this.onStatus("reconnecting");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  /** Send a typed message over the socket */
  send(message: WsOutboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[RoomWS] Cannot send — socket is not open");
    }
  }

  /** Whether the socket is currently open */
  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Close the connection (no auto-reconnect) */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  /* ── Convenience senders ── */

  /** Authenticate with access token from session join */
  sendInit(accessToken: string): void {
    this.send({ type: "init", accessToken });
  }

  /** Signal that the user started recording (press-to-talk) */
  sendStartRecording(): void {
    this.send({ type: "startRecording" });
  }

  /** Stream a base64-encoded audio chunk */
  sendAudioChunk(base64Data: string): void {
    this.send({ type: "audio", data: base64Data });
  }

  /** Signal that the user stopped recording */
  sendStopRecording(latency?: number): void {
    this.send({ type: "stopRecording", latency });
  }

  /** Submit data (assessment answer, form input, etc.) */
  sendSubmitData(
    dataType: string,
    payload: unknown,
    latency?: number,
  ): void {
    this.send({ type: "submitData", dataType, payload, latency });
  }

  /** Trigger a client-side action */
  sendAction(action: WsAction): void {
    this.send({ type: "action", action });
  }
}
