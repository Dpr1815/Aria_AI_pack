/**
 * Unit tests for statistics/registry
 */

import {
  getStatisticsType,
  getStatisticsTypeOrThrow,
  getStatisticsConfig,
  getAllStatisticsTypeIds,
  isStatisticsTypeRegistered,
  aggregateStatistics,
  validateStatisticsData,
  getStatisticsTypes,
  getStatisticsTypesBySummaryId,
  INTERVIEW_STATISTICS_ID,
  LD_STATISTICS_ID,
  DEFAULT_STATISTICS_TYPE_ID,
} from '../../../../src/modules/statistics/registry';

describe('statistics registry', () => {
  describe('getStatisticsType', () => {
    it('should return registry entry for interview stats', () => {
      const entry = getStatisticsType(INTERVIEW_STATISTICS_ID);
      expect(entry).toBeDefined();
      expect(entry!.config).toBeDefined();
    });

    it('should return registry entry for LD stats', () => {
      const entry = getStatisticsType(LD_STATISTICS_ID);
      expect(entry).toBeDefined();
    });

    it('should return undefined for unknown type', () => {
      expect(getStatisticsType('nonexistent')).toBeUndefined();
    });
  });

  describe('getStatisticsTypeOrThrow', () => {
    it('should return entry for valid type', () => {
      expect(getStatisticsTypeOrThrow(INTERVIEW_STATISTICS_ID).config).toBeDefined();
    });

    it('should throw for unknown type', () => {
      expect(() => getStatisticsTypeOrThrow('nonexistent')).toThrow();
    });
  });

  describe('getStatisticsConfig', () => {
    it('should return config for valid type', () => {
      const config = getStatisticsConfig(INTERVIEW_STATISTICS_ID);
      expect(config.id).toBe(INTERVIEW_STATISTICS_ID);
      expect(config.name).toBeDefined();
      expect(config.aggregate).toBeDefined();
    });

    it('should throw for unknown type', () => {
      expect(() => getStatisticsConfig('nonexistent')).toThrow();
    });
  });

  describe('getAllStatisticsTypeIds', () => {
    it('should return all registered type IDs', () => {
      const ids = getAllStatisticsTypeIds();
      expect(ids).toContain(INTERVIEW_STATISTICS_ID);
      expect(ids).toContain(LD_STATISTICS_ID);
    });
  });

  describe('isStatisticsTypeRegistered', () => {
    it('should return true for registered types', () => {
      expect(isStatisticsTypeRegistered(INTERVIEW_STATISTICS_ID)).toBe(true);
      expect(isStatisticsTypeRegistered(LD_STATISTICS_ID)).toBe(true);
    });

    it('should return false for unknown types', () => {
      expect(isStatisticsTypeRegistered('nonexistent')).toBe(false);
    });
  });

  describe('validateStatisticsData', () => {
    it('should return false for unknown type', () => {
      expect(validateStatisticsData('nonexistent', {})).toBe(false);
    });

    it('should return false for invalid data', () => {
      expect(validateStatisticsData(INTERVIEW_STATISTICS_ID, null)).toBe(false);
    });
  });

  describe('aggregateStatistics', () => {
    it('should throw for unknown type', () => {
      expect(() => aggregateStatistics('nonexistent', { summaries: [] })).toThrow();
    });
  });

  describe('getStatisticsTypes', () => {
    it('should return all types as DTOs', () => {
      const types = getStatisticsTypes();
      expect(types.length).toBeGreaterThanOrEqual(2);
      types.forEach((t) => {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t.requiredSummaryTypeId).toBeDefined();
      });
    });
  });

  describe('getStatisticsTypesBySummaryId', () => {
    it('should return types for interview summary type', () => {
      const config = getStatisticsConfig(INTERVIEW_STATISTICS_ID);
      const types = getStatisticsTypesBySummaryId(config.requiredSummaryTypeId);
      expect(types.length).toBeGreaterThanOrEqual(1);
      expect(types.some((t) => t.id === INTERVIEW_STATISTICS_ID)).toBe(true);
    });

    it('should return empty for unknown summary type', () => {
      expect(getStatisticsTypesBySummaryId('nonexistent')).toEqual([]);
    });
  });

  describe('DEFAULT_STATISTICS_TYPE_ID', () => {
    it('should default to interview statistics', () => {
      expect(DEFAULT_STATISTICS_TYPE_ID).toBe(INTERVIEW_STATISTICS_ID);
    });
  });
});
