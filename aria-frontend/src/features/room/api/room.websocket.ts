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
export type WsStatusHandler = (status: "connected" | "disconnected") => void;

export class RoomWebSocket {
  private ws: WebSocket | null = null;
  private onMessage: WsMessageHandler;
  private onStatus: WsStatusHandler;

  constructor(onMessage: WsMessageHandler, onStatus: WsStatusHandler) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  /** Open the WebSocket connection */
  connect(): void {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
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
      this.onStatus("disconnected");
    };
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

  /** Close the connection */
  disconnect(): void {
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
