/**
 * Statistics Module Types
 *
 * Generic, definition-driven type definitions for the statistics system.
 *
 * Adding a new statistics type requires ONLY:
 *   1. A new definition folder under definitions/<your-type>/
 *      - config.ts  → StatisticsDefinition (exports its own ID)
 *      - aggregator.ts → pure aggregation function
 *      - schema.ts → Zod output validation
 *   2. Registration in registry.ts (one line)
 *
 * Zero changes needed in StatisticsService.
 */

import { ZodSchema } from 'zod';

// ============================================
// AGGREGATOR
// ============================================

/**
 * Raw input passed to every aggregator function.
 *
 * The service resolves these from the database and hands them over
 * so aggregators stay pure and testable (no I/O).
 */
export interface AggregatorInput {
  /** All summaries for the agent within the requested period. */
  summaries: { data: Record<string, unknown> }[];
}
/**
 * A pure function that receives pre-fetched data and returns
 * the aggregated statistics payload.
 *
 * Aggregators must be deterministic and side-effect free.
 */
export type StatisticsAggregator = (input: AggregatorInput) => Record<string, unknown>;

// ============================================
// TOP-LEVEL DEFINITION
// ============================================

/**
 * Complete definition for a statistics type.
 *
 * This is the single source of truth that drives the entire
 * statistics aggregation pipeline for a given typeId.
 */
export interface StatisticsDefinition {
  /** Unique identifier. Each definition exports its own as a const. */
  id: string;

  /** Human-readable name. */
  name: string;

  /** Description of what this statistics type aggregates. */
  description: string;

  /**
   * The summary typeId whose output this statistics type consumes.
   * Only summaries matching this typeId are passed to the aggregator.
   */
  requiredSummaryTypeId: string;

  /**
   * Pure aggregation function.
   * Receives resolved data, returns the `data` payload persisted
   * on AgentStatisticsDocument.
   */
  aggregate: StatisticsAggregator;

  /**
   * Zod schema to validate the aggregator output.
   * Ensures type-safe, consistent statistics payloads.
   */
  outputSchema: ZodSchema;
}

// ============================================
// REGISTRY TYPE
// ============================================

export interface StatisticsRegistryEntry {
  config: StatisticsDefinition;
}
