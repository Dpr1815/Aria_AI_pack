/**
 * Internal API Connector
 *
 * HTTP client for service-to-service communication with the API server.
 * Authenticates using a long-lived service JWT (type: 'service').
 *
 * Design:
 * - Fire-and-forget friendly — errors are logged, never thrown to callers
 * - Uses native fetch (Node 18+)
 * - All calls go through /internal/* endpoints (not exposed publicly)
 */

import type { IApiConnector, SummaryGenerationResponse } from './IApiConnector';
import { createLogger, CircuitBreaker, ExternalServiceError } from '@utils';

const logger = createLogger('ApiConnector');

// ============================================
// Configuration
// ============================================

export interface ApiConnectorConfig {
  /** Base URL of the API server (e.g., http://api-server:8080) */
  baseUrl: string;
  /** Long-lived service JWT for authentication */
  serviceToken: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

// ============================================
// Implementation
// ============================================

export class ApiConnector implements IApiConnector {
  private readonly baseUrl: string;
  private readonly serviceToken: string;
  private readonly timeoutMs: number;
  private readonly breaker: CircuitBreaker;

  constructor(config: ApiConnectorConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.serviceToken = config.serviceToken;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.breaker = new CircuitBreaker('InternalAPI', {
      failureThreshold: 5,
      resetTimeoutMs: 60_000,
      monitorWindowMs: 60_000,
    });
  }

  async generateSummary(sessionId: string): Promise<SummaryGenerationResponse> {
    const url = `${this.baseUrl}/internal/summaries/session/${sessionId}`;

    try {
      return await this.breaker.execute(async () => {
        logger.info(`Triggering summary generation for session ${sessionId}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new ExternalServiceError(
            'InternalAPI',
            `Summary generation failed: HTTP ${response.status} — ${errorBody}`,
          );
        }

        const data = await response.json();
        logger.info(`Summary generation triggered successfully for session ${sessionId}`);
        return { success: true as const, data };
      });
    } catch (error) {
      logger.error(`Summary generation request failed for session ${sessionId}`, error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  async refreshStatistics(agentId: string): Promise<SummaryGenerationResponse> {
    const url = `${this.baseUrl}/internal/statistics/${agentId}/calculate`;

    try {
      return await this.breaker.execute(async () => {
        logger.info(`Triggering statistics refresh for agent ${agentId}`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.serviceToken}`,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new ExternalServiceError(
            'InternalAPI',
            `Statistics refresh failed: HTTP ${response.status} — ${errorBody}`,
          );
        }

        const data = await response.json();
        logger.info(`Statistics update triggered successfully for agent ${agentId}`);
        return { success: true as const, data };
      });
    } catch (error) {
      logger.error(`Statistics update request failed for agent ${agentId}`, error as Error);
      return { success: false, error: (error as Error).message };
    }
  }
}

// ============================================
// Factory
// ============================================

export function createApiConnector(config: ApiConnectorConfig): ApiConnector {
  return new ApiConnector(config);
}
