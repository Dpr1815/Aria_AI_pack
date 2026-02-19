/**
 * Handlers Index
 *
 * Exports all handler functions and registry utilities.
 */

// ============================================
// Registry
// ============================================
export { handlerRegistry, getHandler, hasHandler, getRegisteredTypes } from './registry';

// ============================================
// Individual Handlers (for direct access if needed)
// ============================================
export { execute as executeInit } from './init.handler';
export { execute as executeStartRecording } from './startRecording.handler';
export { execute as executeAudio } from './audio.handler';
export { execute as executeStopRecording } from './stopRecording.handler';
