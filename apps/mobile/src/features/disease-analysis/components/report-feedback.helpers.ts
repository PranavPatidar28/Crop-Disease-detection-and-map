/** Which thumb the farmer selected for the advisory feedback. */
export type FeedbackVote = 'up' | 'down';

/**
 * Thank-you headline echoing the farmer's choice back to them. Kept as a pure
 * function so it can be unit-tested under the repo's logic-only Jest setup
 * (component rendering is out of that scope).
 */
export function feedbackConfirmation(vote: FeedbackVote): string {
  return vote === 'up' ? 'You found this helpful' : "You said this didn't help";
}
