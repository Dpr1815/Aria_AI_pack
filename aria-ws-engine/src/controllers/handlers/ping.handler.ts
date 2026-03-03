/**
 * Ping Handler
 *
 * Responds to application-level heartbeat pings with a pong.
 * Allows clients (browsers) to detect half-open connections
 * since the WebSocket API doesn't expose protocol-level ping/pong.
 */

import type { WebSocket } from 'ws';
import type { ClientMessage, HandlerContext } from '@types';
import { send } from './ws.utils';

export async function execute(ws: WebSocket, _data: ClientMessage, _context: HandlerContext): Promise<void> {
  send(ws, { type: 'pong' });
}
