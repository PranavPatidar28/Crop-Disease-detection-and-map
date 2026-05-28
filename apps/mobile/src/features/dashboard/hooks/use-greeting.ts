/**
 * Returns a contextual greeting based on the user's local time.
 */
export function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up early';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
