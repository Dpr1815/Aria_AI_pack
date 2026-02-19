/**
 * StateMachine Unit Tests
 *
 * Tests the pure functions that handle step navigation.
 */

import * as StateMachine from '@services/conversation/StateMachine';
import { createMockAgent } from '../../mocks/data/agents.mock';

describe('StateMachine', () => {
  const agent = createMockAgent({ stepOrder: ['greeting', 'interview', 'assessment', 'closing'] }) as any;

  // ── Step Access ──

  describe('getStepOrder', () => {
    it('returns the step order array from the agent', () => {
      expect(StateMachine.getStepOrder(agent)).toEqual([
        'greeting',
        'interview',
        'assessment',
        'closing',
      ]);
    });
  });

  describe('getStepInfo', () => {
    it('returns correct info for the first step', () => {
      const info = StateMachine.getStepInfo(agent, 'greeting');
      expect(info).toEqual({
        key: 'greeting',
        index: 0,
        total: 4,
        isFirst: true,
        isLast: false,
      });
    });

    it('returns correct info for a middle step', () => {
      const info = StateMachine.getStepInfo(agent, 'interview');
      expect(info).toEqual({
        key: 'interview',
        index: 1,
        total: 4,
        isFirst: false,
        isLast: false,
      });
    });

    it('returns correct info for the last step', () => {
      const info = StateMachine.getStepInfo(agent, 'closing');
      expect(info).toEqual({
        key: 'closing',
        index: 3,
        total: 4,
        isFirst: false,
        isLast: true,
      });
    });

    it('returns null for unknown step', () => {
      expect(StateMachine.getStepInfo(agent, 'nonexistent')).toBeNull();
    });
  });

  // ── Navigation ──

  describe('getFirstStep', () => {
    it('returns the first step key', () => {
      expect(StateMachine.getFirstStep(agent)).toBe('greeting');
    });

    it('throws when agent has no steps', () => {
      const emptyAgent = createMockAgent({ stepOrder: [] }) as any;
      expect(() => StateMachine.getFirstStep(emptyAgent)).toThrow('has no steps defined');
    });
  });

  describe('getLastStep', () => {
    it('returns the last step key', () => {
      expect(StateMachine.getLastStep(agent)).toBe('closing');
    });

    it('throws when agent has no steps', () => {
      const emptyAgent = createMockAgent({ stepOrder: [] }) as any;
      expect(() => StateMachine.getLastStep(emptyAgent)).toThrow('has no steps defined');
    });
  });

  describe('getNextStep', () => {
    it('returns the next step', () => {
      expect(StateMachine.getNextStep(agent, 'greeting')).toBe('interview');
      expect(StateMachine.getNextStep(agent, 'interview')).toBe('assessment');
    });

    it('returns null for the last step', () => {
      expect(StateMachine.getNextStep(agent, 'closing')).toBeNull();
    });

    it('returns null for unknown step', () => {
      expect(StateMachine.getNextStep(agent, 'nonexistent')).toBeNull();
    });
  });

  describe('getPreviousStep', () => {
    it('returns the previous step', () => {
      expect(StateMachine.getPreviousStep(agent, 'interview')).toBe('greeting');
      expect(StateMachine.getPreviousStep(agent, 'closing')).toBe('assessment');
    });

    it('returns null for the first step', () => {
      expect(StateMachine.getPreviousStep(agent, 'greeting')).toBeNull();
    });

    it('returns null for unknown step', () => {
      expect(StateMachine.getPreviousStep(agent, 'nonexistent')).toBeNull();
    });
  });

  describe('getNavigation', () => {
    it('returns full navigation for a middle step', () => {
      const nav = StateMachine.getNavigation(agent, 'interview');
      expect(nav).toEqual({
        currentStep: 'interview',
        nextStep: 'assessment',
        previousStep: 'greeting',
        isFirst: false,
        isLast: false,
      });
    });

    it('returns null neighbors for edge steps', () => {
      const first = StateMachine.getNavigation(agent, 'greeting');
      expect(first.previousStep).toBeNull();
      expect(first.isFirst).toBe(true);

      const last = StateMachine.getNavigation(agent, 'closing');
      expect(last.nextStep).toBeNull();
      expect(last.isLast).toBe(true);
    });
  });

  // ── Transitions ──

  describe('calculateTransition', () => {
    it('returns transition to next step', () => {
      const transition = StateMachine.calculateTransition(agent, 'greeting');
      expect(transition).toEqual({
        from: 'greeting',
        to: 'interview',
        isLast: false,
      });
    });

    it('marks last step transition correctly', () => {
      const transition = StateMachine.calculateTransition(agent, 'closing');
      expect(transition).toEqual({
        from: 'closing',
        to: null,
        isLast: true,
      });
    });
  });

  describe('moveToNextStep', () => {
    it('advances to the next step', () => {
      expect(StateMachine.moveToNextStep(agent, 'greeting')).toBe('interview');
    });

    it('stays on current step if already last', () => {
      expect(StateMachine.moveToNextStep(agent, 'closing')).toBe('closing');
    });
  });

  // ── Validation ──

  describe('isValidStep', () => {
    it('returns true for valid steps', () => {
      expect(StateMachine.isValidStep(agent, 'greeting')).toBe(true);
      expect(StateMachine.isValidStep(agent, 'closing')).toBe(true);
    });

    it('returns false for invalid steps', () => {
      expect(StateMachine.isValidStep(agent, 'nonexistent')).toBe(false);
    });
  });

  describe('isFirstStep / isLastStep', () => {
    it('identifies the first step', () => {
      expect(StateMachine.isFirstStep(agent, 'greeting')).toBe(true);
      expect(StateMachine.isFirstStep(agent, 'interview')).toBe(false);
    });

    it('identifies the last step', () => {
      expect(StateMachine.isLastStep(agent, 'closing')).toBe(true);
      expect(StateMachine.isLastStep(agent, 'interview')).toBe(false);
    });
  });

  // ── Progress ──

  describe('getStepIndex', () => {
    it('returns correct indices', () => {
      expect(StateMachine.getStepIndex(agent, 'greeting')).toBe(0);
      expect(StateMachine.getStepIndex(agent, 'closing')).toBe(3);
    });

    it('returns -1 for unknown step', () => {
      expect(StateMachine.getStepIndex(agent, 'nonexistent')).toBe(-1);
    });
  });

  describe('getStepCount', () => {
    it('returns the total number of steps', () => {
      expect(StateMachine.getStepCount(agent)).toBe(4);
    });
  });

  describe('getRemainingSteps', () => {
    it('returns correct remaining count', () => {
      expect(StateMachine.getRemainingSteps(agent, 'greeting')).toBe(3);
      expect(StateMachine.getRemainingSteps(agent, 'assessment')).toBe(1);
      expect(StateMachine.getRemainingSteps(agent, 'closing')).toBe(0);
    });

    it('returns total count for unknown step', () => {
      expect(StateMachine.getRemainingSteps(agent, 'nonexistent')).toBe(4);
    });
  });
});
