/**
 * Prevents orphan words across all screen widths and viewports.
 * In typography, an orphan is when a single word appears alone on its own line.
 * For 3-word titles (e.g. "Validate Survey Participants"), all words are bound
 * together with non-breaking spaces so they fit on a single line without leaving
 * one word stranded.
 * For 4-word titles (e.g. "Faster Digital Asset Creation"), words are bound into
 * balanced pairs (2 and 2) so any wrap creates two 2-word lines and never an isolated word.
 * For 5-word titles (e.g. "Market Changes in Real Time"), words are bound into 2 and 3.
 */
export function preventOrphanWords(text: string): string {
  if (!text || typeof text !== "string") return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return text.trim();

  if (words.length === 2) {
    return words.join("\u00A0");
  }

  if (words.length === 3) {
    return words.join("\u00A0");
  }

  if (words.length === 4) {
    return `${words[0]}\u00A0${words[1]} ${words[2]}\u00A0${words[3]}`;
  }

  if (words.length === 5) {
    return `${words[0]}\u00A0${words[1]} ${words[2]}\u00A0${words[3]}\u00A0${words[4]}`;
  }

  const firstBound = `${words[0]}\u00A0${words[1]}`;
  const middle = words.slice(2, -2).join(" ");
  const lastBound = `${words[words.length - 2]}\u00A0${words[words.length - 1]}`;
  return [firstBound, middle, lastBound].filter(Boolean).join(" ");
}
