import { MediaItem } from '../types';

/**
 * Retrieves and formats the rating score from a media object or numeric/string value.
 * If the rating is missing, null, undefined, 0, or invalid, returns 'N/A'.
 * Otherwise returns the formatted score as a string (e.g. '8.5').
 *
 * @param mediaOrScore MediaItem, object with score/averageScore, number, string, null, or undefined
 * @returns Formatted rating string or 'N/A'
 */
export function getRatingDisplay(
  mediaOrScore?:
    | MediaItem
    | { score?: number | string | null; averageScore?: number | null }
    | number
    | string
    | null
): string {
  if (mediaOrScore === null || mediaOrScore === undefined) {
    return 'N/A';
  }

  let rawScore: unknown = mediaOrScore;

  if (typeof mediaOrScore === 'object') {
    if ('score' in mediaOrScore && mediaOrScore.score !== null && mediaOrScore.score !== undefined) {
      rawScore = mediaOrScore.score;
    } else if (
      'averageScore' in mediaOrScore &&
      mediaOrScore.averageScore !== null &&
      mediaOrScore.averageScore !== undefined
    ) {
      rawScore = mediaOrScore.averageScore;
    } else {
      return 'N/A';
    }
  }

  if (rawScore === null || rawScore === undefined || rawScore === '' || rawScore === 'N/A') {
    return 'N/A';
  }

  const num = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore));

  if (isNaN(num) || num <= 0) {
    return 'N/A';
  }

  // Normalize 100-point scale (e.g., AniList averageScore 85 -> 8.5)
  const normalized = num > 10 ? num / 10 : num;

  return normalized.toFixed(1);
}
