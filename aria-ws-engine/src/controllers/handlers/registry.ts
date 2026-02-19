/**
 * Handler Registry
 *
 * Maps WebSocket message types to handler functions.
 * This is the ONLY place where message routing is defined.
 *
 * To add a new message type:
 * 1. Create newType.handler.ts with execute function
 * 2. Import and add to this registry
 */

import type { HandlerRegistry, ClientMessageType, HandlerConfig } from '@types';

import { execute as init } from './init.handler';
import { execute as startRecording } from './startRecording.handler';
import { execute as audio } from './audio.handler';
import { execute as stopRecording } from './stopRecording.handler';
import { execute as submitData } from './submitData.handler';

export const handlerRegistry: HandlerRegistry = {
  init: {
    execute: init,
    requiresAuth: false, // This establishes auth
  },
  startRecording: {
    execute: startRecording,
    requiresAuth: true,
  },
  audio: {
    execute: audio,
    requiresAuth: true,
  },
  stopRecording: {
    execute: stopRecording,
    requiresAuth: true,
  },
  submitData: {
    execute: submitData,
    requiresAuth: true,
  },
};

export function getHandler(type: ClientMessageType): HandlerConfig | undefined {
  return handlerRegistry[type];
}

export function hasHandler(type: string): type is ClientMessageType {
  return type in handlerRegistry;
}

export function getRegisteredTypes(): ClientMessageType[] {
  return Object.keys(handlerRegistry) as ClientMessageType[];
}
