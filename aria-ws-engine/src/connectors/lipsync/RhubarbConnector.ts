/**
 * Rhubarb Lip Sync Connector
 *
 * Implements ILipSyncConnector using Rhubarb Lip Sync CLI.
 * Generates viseme cues from audio for avatar animation.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { VisemeCue, LipSyncResult } from '../../types/audio.types';
import type { ILipSyncConnector, LipSyncConnectorConfig } from './ILipSyncConnector';
import { DEFAULT_LIPSYNC_CONFIG, getVisemeMorphs } from './ILipSyncConnector';
import { pcmToWav } from '../../utils/audio/pcmToWav';
import { CircuitBreaker, ExternalServiceError } from '@utils';

// ============================================
// Types
// ============================================

interface RhubarbCue {
  start: number;
  end: number;
  value: string;
}

interface RhubarbOutput {
  mouthCues: RhubarbCue[];
}

// ============================================
// Rhubarb Connector Class
// ============================================

export class RhubarbConnector implements ILipSyncConnector {
  private ready = false;
  private readonly config: Required<LipSyncConnectorConfig>;
  private readonly breaker: CircuitBreaker;

  constructor(config?: Partial<LipSyncConnectorConfig>) {
    this.config = {
      executablePath: config?.executablePath ?? DEFAULT_LIPSYNC_CONFIG.executablePath!,
      timeoutMs: config?.timeoutMs ?? DEFAULT_LIPSYNC_CONFIG.timeoutMs!,
      recognizer: config?.recognizer ?? DEFAULT_LIPSYNC_CONFIG.recognizer!,
      extendedShapes: config?.extendedShapes ?? DEFAULT_LIPSYNC_CONFIG.extendedShapes!,
    };

    this.breaker = new CircuitBreaker('Rhubarb', {
      failureThreshold: 3,
      resetTimeoutMs: 30_000,
      monitorWindowMs: 60_000,
    });

    this.ready = true;
  }

  /**
   * Generate lip sync data from audio buffer.
   */
  async generate(audioBuffer: Buffer, text?: string): Promise<LipSyncResult> {
    if (!this.ready) {
      throw new ExternalServiceError('Rhubarb', 'Connector not ready');
    }

    // Create temp files
    const tempDir = os.tmpdir();
    const sessionId = uuidv4();
    const wavPath = path.join(tempDir, `rhubarb-${sessionId}.wav`);
    const dialogPath = text ? path.join(tempDir, `rhubarb-${sessionId}.txt`) : undefined;

    try {
      return await this.breaker.execute(async () => {
        // Convert PCM to WAV
        const wavBuffer = pcmToWav(audioBuffer, { sampleRate: 24000 });
        await fs.promises.writeFile(wavPath, wavBuffer);

        // Write dialog file if text provided
        if (dialogPath && text) {
          await fs.promises.writeFile(dialogPath, text, 'utf-8');
        }

        // Run Rhubarb
        const output = await this.runRhubarb(wavPath, dialogPath);

        // Parse and process cues
        const cues = this.processCues(output.mouthCues);
        const duration = cues.length > 0 ? cues[cues.length - 1].end : 0;

        return {
          cues,
          duration,
          text: text ?? '',
        };
      });
    } finally {
      // Cleanup temp files
      await this.cleanup(wavPath, dialogPath);
    }
  }

  /**
   * Run Rhubarb CLI.
   */
  private runRhubarb(wavPath: string, dialogPath?: string): Promise<RhubarbOutput> {
    return new Promise((resolve, reject) => {
      const args = [wavPath, '-f', 'json', '-r', this.config.recognizer];

      if (this.config.extendedShapes) {
        args.push('--extendedShapes', 'GHX');
      }

      if (dialogPath) {
        args.push('-d', dialogPath);
      }

      const process = spawn(this.config.executablePath, args);

      let stdout = '';
      let stderr = '';

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Rhubarb timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(new Error(`Rhubarb exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const output = JSON.parse(stdout) as RhubarbOutput;
          resolve(output);
        } catch (error) {
          reject(new Error(`Failed to parse Rhubarb output: ${error}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Process Rhubarb cues into our format.
   */
  private processCues(rawCues: RhubarbCue[]): VisemeCue[] {
    const cues: VisemeCue[] = [];
    const minDuration = 0.05; // Filter cues shorter than 50ms

    for (let i = 0; i < rawCues.length; i++) {
      const raw = rawCues[i];
      const duration = raw.end - raw.start;

      // Filter very short cues
      if (duration < minDuration) {
        continue;
      }

      // Merge consecutive same visemes
      if (cues.length > 0 && cues[cues.length - 1].value === raw.value) {
        cues[cues.length - 1].end = raw.end;
        continue;
      }

      cues.push({
        start: raw.start,
        end: raw.end,
        value: raw.value,
        morphs: getVisemeMorphs(raw.value),
      });
    }

    return cues;
  }

  /**
   * Cleanup temp files.
   */
  private async cleanup(wavPath: string, dialogPath?: string): Promise<void> {
    try {
      await fs.promises.unlink(wavPath);
      if (dialogPath) {
        await fs.promises.unlink(dialogPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if lip sync is enabled.
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Check if connector is ready.
   */
  isReady(): boolean {
    return this.ready;
  }
}

// ============================================
// Factory Function
// ============================================

export function createRhubarbConnector(config?: Partial<LipSyncConnectorConfig>): RhubarbConnector {
  return new RhubarbConnector(config);
}
