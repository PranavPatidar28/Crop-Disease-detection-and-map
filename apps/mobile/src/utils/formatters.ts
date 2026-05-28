/** Simple debounce/sleep helpers. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (input: string | Date): string => {
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toLocaleString();
};
