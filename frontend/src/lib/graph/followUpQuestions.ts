/**
 * FOLLOWUPQUESTIONS.TS
 * Generate context-aware follow-up questions from answers
 * Phase 5.6: Answer → suggested next steps
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
 * Generate follow-up questions from answer
 * Returns 2-4 contextual suggestions
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

  // Success answers: context-aware follow-ups
  if (answer.type === 'success') {
    // If we cited a single node, suggest its relationships
    if (answer.citedNodes.length === 1 && answer.citedProjects.length === 0) {
      const node = answer.citedNodes[0];
      followUps.push({
        text: `What shaped "${node.title}"?`,
        reason: 'Explore incoming relationships',
      });
      followUps.push({
        text: `What did "${node.title}" produce?`,
        reason: 'Explore outgoing relationships',
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
    if (answer.citedNodes.length > 2) {
      followUps.push({
        text: `What tags are shared among these nodes?`,
        reason: 'Find common themes',
      });
    }

    // Always offer pattern exploration
    if (followUps.length < 3) {
      followUps.push({
        text: 'What patterns appear in the graph?',
        reason: 'Step back and explore',
      });
    }
  }

  // Return up to 4 suggestions
  return followUps.slice(0, 4);
}

/**
 * Format follow-up for display
 */
export function formatFollowUp(suggestion: FollowUpSuggestion): string {
  return suggestion.text;
}
