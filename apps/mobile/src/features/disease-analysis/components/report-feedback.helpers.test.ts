import { feedbackConfirmation, type FeedbackVote } from './report-feedback.helpers';

describe('feedbackConfirmation', () => {
  it('returns the positive line for an up vote', () => {
    expect(feedbackConfirmation('up')).toBe('You found this helpful');
  });

  it('returns the negative line for a down vote', () => {
    expect(feedbackConfirmation('down')).toBe("You said this didn't help");
  });

  it('accepts the FeedbackVote type for both values', () => {
    const votes: FeedbackVote[] = ['up', 'down'];
    expect(votes.map(feedbackConfirmation)).toEqual([
      'You found this helpful',
      "You said this didn't help",
    ]);
  });
});
