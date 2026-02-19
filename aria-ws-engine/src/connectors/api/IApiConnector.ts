/**
 * Internal API Connector Interface
 *
 * Contract for service-to-service communication with the API server.
 * Used to trigger operations that live on the API server (e.g., summary generation).
 */

export interface SummaryGenerationResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface IApiConnector {
  /**
   * Trigger summary generation for a completed session.
   */
  generateSummary(sessionId: string): Promise<SummaryGenerationResponse>;
  refreshStatistics(agentId: string): Promise<SummaryGenerationResponse>;
}
