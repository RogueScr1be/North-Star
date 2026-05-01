/**
 * FOLLOWUPQUESTIONS.TS
 * Generate context-aware follow-up questions from answers
 * Phase 5.6: Answer → suggested next steps
 * Phase 13B: Keyword-based contextualization
 */

import { Answer } from './answerComposer';

/**
 * Follow-up suggestion based on answer context
 */
export interface FollowUpSuggestion {
  text: string;
  reason: string; // Explanation for user visibility
}

/**
 * Detect contextual keywords in answer text (Phase 13B)
 */
function detectContextKeywords(text: string) {
  const lower = text.toLowerCase();
  return {
    hasGetIT: lower.includes('getit') || lower.includes('get-it'),
    hasFastFood: lower.includes('fast food'),
    hasAnansi: lower.includes('anansi'),
    hasNorthStar: lower.includes('north star'),
    hasDecision: lower.includes('decision'),
    hasConstraint: lower.includes('constraint') || lower.includes('problem'),
    hasStrategy: lower.includes('should') || lower.includes('next'),
    hasPatterns: lower.includes('pattern') || lower.includes('tag'),
  };
}

/**
 * Generate follow-up questions from answer
 * Returns 2-3 contextual suggestions (Phase 13B: keyword-aware)
 */
export function generateFollowUps(
  answer: Answer,
  primaryEntity?: string,
  secondaryEntity?: string
): FollowUpSuggestion[] {
  const followUps: FollowUpSuggestion[] = [];

  // Base: if insufficient/no data, suggest similar searches
  if (answer.type === 'no_data' || answer.type === 'insufficient_evidence') {
    if (primaryEntity) {
      followUps.push({
        text: `What nodes mention "${primaryEntity}"?`,
        reason: 'Search for partial matches',
      });
    }
    return followUps;
  }

  if (answer.type === 'unparseable') {
    return [
      {
        text: 'What projects exist in the graph?',
        reason: 'Get oriented',
      },
      {
        text: 'What patterns appear across projects?',
        reason: 'Explore structure',
      },
    ];
  }

  // Success answers: context-aware follow-ups (Phase 13B: keyword-based)
  if (answer.type === 'success') {
    const keywords = detectContextKeywords(answer.text);

    // Phase 13B: Keyword-based contextual suggestions
    if (keywords.hasGetIT) {
      followUps.push({
        text: 'How does this affect GetIT?',
        reason: 'Specific to GetIT project',
      });
    }

    if (keywords.hasFastFood) {
      followUps.push({
        text: 'What should Fast Food do with this?',
        reason: 'Specific to Fast Food project',
      });
    }

    if (keywords.hasDecision) {
      followUps.push({
        text: 'What decision should I make?',
        reason: 'Decision-specific follow-up',
      });
    }

    if (keywords.hasConstraint && followUps.length < 2) {
      followUps.push({
        text: 'How do I address this constraint?',
        reason: 'Constraint-specific follow-up',
      });
    }

    // Phase 5.6: Fallback contextualization (keep existing logic if no keywords matched)
    if (followUps.length === 0) {
      // If we cited a single node, suggest its relationships
      if (answer.citedNodes.length === 1 && answer.citedProjects.length === 0) {
        const node = answer.citedNodes[0];
        followUps.push({
          text: `What shaped "${node.title}"?`,
          reason: 'Explore incoming relationships',
        });
      }

      // If we cited a single project, suggest its scope
      if (answer.citedProjects.length === 1 && answer.citedNodes.length === 0) {
        const proj = answer.citedProjects[0];
        followUps.push({
          text: `What decisions shaped "${proj.title}"?`,
          reason: 'Explore key decisions',
        });
      }

      // If we showed a relationship, suggest reverse
      if (primaryEntity && secondaryEntity && answer.citedNodes.length >= 2) {
        followUps.push({
          text: `How is "${secondaryEntity}" connected to "${primaryEntity}"?`,
          reason: 'Explore reverse direction',
        });
      }

      // If we found patterns, suggest exploring specific ones
      if (answer.citedNodes.length > 2 && followUps.length < 2) {
        followUps.push({
          text: `What tags are shared among these nodes?`,
          reason: 'Find common themes',
        });
      }
    }

    // Always offer a generic fallback (Phase 13B: moved to end)
    if (followUps.length < 3) {
      followUps.push({
        text: 'What should I do next?',
        reason: 'General exploration',
      });
    }
  }

  // Return up to 3 suggestions (Phase 13B: reduced from 4 for focus)
  return followUps.slice(0, 3);
}

/**
 * Format follow-up for display
 */
export function formatFollowUp(suggestion: FollowUpSuggestion): string {
  return suggestion.text;
}
