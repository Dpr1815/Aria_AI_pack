/**
 * Unit tests for summaries/registry
 */

import {
  getSummaryType,
  getSummaryTypeOrThrow,
  getSummaryConfig,
  getAllSummaryTypeIds,
  isSummaryTypeRegistered,
  validateSummaryData,
  parseSummaryData,
  getSummaryTypes,
  getSummaryTypesByConversationType,
  INTERVIEW_SUMMARY_ID,
  LD_SUMMARY_ID,
} from '../../../../src/modules/summaries/registry';

describe('summaries registry', () => {
  describe('getSummaryType', () => {
    it('should return registry entry for interview summary', () => {
      const entry = getSummaryType(INTERVIEW_SUMMARY_ID);
      expect(entry).toBeDefined();
      expect(entry!.config).toBeDefined();
    });

    it('should return registry entry for LD summary', () => {
      const entry = getSummaryType(LD_SUMMARY_ID);
      expect(entry).toBeDefined();
    });

    it('should return undefined for unknown type', () => {
      expect(getSummaryType('nonexistent')).toBeUndefined();
    });
  });

  describe('getSummaryTypeOrThrow', () => {
    it('should return entry for valid type', () => {
      expect(getSummaryTypeOrThrow(INTERVIEW_SUMMARY_ID).config).toBeDefined();
    });

    it('should throw for unknown type', () => {
      expect(() => getSummaryTypeOrThrow('nonexistent')).toThrow();
    });
  });

  describe('getSummaryConfig', () => {
    it('should return config for valid type', () => {
      const config = getSummaryConfig(INTERVIEW_SUMMARY_ID);
      expect(config.id).toBe(INTERVIEW_SUMMARY_ID);
      expect(config.name).toBeDefined();
    });

    it('should throw for unknown type', () => {
      expect(() => getSummaryConfig('nonexistent')).toThrow();
    });
  });

  describe('getAllSummaryTypeIds', () => {
    it('should return all registered type IDs', () => {
      const ids = getAllSummaryTypeIds();
      expect(ids).toContain(INTERVIEW_SUMMARY_ID);
      expect(ids).toContain(LD_SUMMARY_ID);
    });
  });

  describe('isSummaryTypeRegistered', () => {
    it('should return true for registered types', () => {
      expect(isSummaryTypeRegistered(INTERVIEW_SUMMARY_ID)).toBe(true);
      expect(isSummaryTypeRegistered(LD_SUMMARY_ID)).toBe(true);
    });

    it('should return false for unknown types', () => {
      expect(isSummaryTypeRegistered('nonexistent')).toBe(false);
    });
  });

  describe('validateSummaryData', () => {
    it('should return false for unknown type', () => {
      expect(validateSummaryData('nonexistent', {})).toBe(false);
    });

    it('should return false for invalid data', () => {
      // Pass obviously invalid data (null)
      expect(validateSummaryData(INTERVIEW_SUMMARY_ID, null)).toBe(false);
    });
  });

  describe('parseSummaryData', () => {
    it('should throw for unknown type', () => {
      expect(() => parseSummaryData('nonexistent', {})).toThrow();
    });

    it('should throw for invalid data', () => {
      expect(() => parseSummaryData(INTERVIEW_SUMMARY_ID, 'not-an-object')).toThrow();
    });
  });

  describe('getSummaryTypes', () => {
    it('should return all types as DTOs', () => {
      const types = getSummaryTypes();
      expect(types.length).toBeGreaterThanOrEqual(2);
      types.forEach((t) => {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t.compatibleConversationTypes).toBeDefined();
      });
    });
  });

  describe('getSummaryTypesByConversationType', () => {
    it('should return types compatible with interview', () => {
      const types = getSummaryTypesByConversationType('interview');
      expect(types.length).toBeGreaterThanOrEqual(1);
      expect(types.some((t) => t.id === INTERVIEW_SUMMARY_ID)).toBe(true);
    });

    it('should return empty array for unknown conversation type', () => {
      const types = getSummaryTypesByConversationType('nonexistent');
      expect(types).toEqual([]);
    });
  });
});
