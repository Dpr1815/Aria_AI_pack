/**
 * Slides Utility
 *
 * Builds the presentation slides mapping from stepOrder.
 * Steps sharing the same parent step get the same slide number.
 *
 * Example:
 *   stepOrder: ['intro', 'introWork', 'work', 'conclusionWork', 'reportScenario', 'behavioral', 'reportBehavioral', 'conclusion']
 *   result:    { intro: 1, introWork: 2, work: 2, conclusionWork: 2, reportScenario: 2, behavioral: 3, reportBehavioral: 3, conclusion: 4 }
 *
 * Group key logic:
 *   - If step has a parentStep (e.g. introWork → parent 'work') → group = parentStep
 *   - Otherwise → group = stepId itself
 *   - This means parent steps and their children share the same slide
 */

import { getParentStep } from '@modules';

/**
 * Build slides mapping from stepOrder.
 * Steps grouped by parent share the same slide number.
 * Slide numbers are sequential based on first appearance of each group.
 */
export function buildSlidesFromStepOrder(stepOrder: string[]): Record<string, number> {
  const slides: Record<string, number> = {};
  const groupToSlide: Record<string, number> = {};
  let currentSlide = 1;

  for (const stepKey of stepOrder) {
    const groupKey = getParentStep(stepKey) || stepKey;

    if (!(groupKey in groupToSlide)) {
      groupToSlide[groupKey] = currentSlide++;
    }

    slides[stepKey] = groupToSlide[groupKey];
  }

  return slides;
}
