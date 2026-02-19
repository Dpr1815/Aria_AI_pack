// ============================================
// RESPONSE DTOs
// ============================================

/**
 * Base summary response
 */
export interface SummaryDTO {
  _id: string;
  sessionId: string;
  agentId: string;
  participantId: string;
  typeId: string;
  data: Record<string, unknown>;
  generatedAt: string;
}

/**
 * Summary with related info (for listings)
 */
export interface SummaryWithContextDTO extends SummaryDTO {
  session?: {
    _id: string;
    status: string;
    completedAt?: string;
  };
  participant?: {
    _id: string;
    email: string;
    name?: string;
  };
}

// ============================================
// INPUT DTOs (mirror validation types)
// ============================================

export interface GenerateSummaryOptions {
  includeSections?: string[];
  excludeSections?: string[];
  language?: string;
}

export interface GenerateSummaryDTO {
  typeId?: string;
  options?: GenerateSummaryOptions;
}
export interface SummaryTypeDTO {
  id: string;
  name: string;
  description: string;
  compatibleConversationTypes: string[];
}
