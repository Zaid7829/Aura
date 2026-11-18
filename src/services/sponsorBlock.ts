/**
 * SponsorBlock Service
 * Fetches crowd-sourced non-music segments (sponsor pitches, intros, silence, outros)
 * and automatically cuts them out during YouTube playback.
 */

export interface SkipSegment {
  category: string;
  segment: [number, number]; // [startSeconds, endSeconds]
  UUID: string;
}

const segmentCache = new Map<string, SkipSegment[]>();

export async function fetchSkipSegments(videoId: string): Promise<SkipSegment[]> {
  if (!videoId) return [];
  if (segmentCache.has(videoId)) {
    return segmentCache.get(videoId)!;
  }

  try {
    const categories = JSON.stringify([
      'sponsor',
      'intro',
      'outro',
      'music_offtopic',
      'preview',
      'filler',
    ]);
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
      videoId
    )}&categories=${encodeURIComponent(categories)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.status === 404) {
      // No segments reported
      segmentCache.set(videoId, []);
      return [];
    }

    if (!res.ok) {
      return [];
    }

    const data: SkipSegment[] = await res.json();
    segmentCache.set(videoId, data);
    return data;
  } catch (err) {
    console.warn('SponsorBlock fetch error:', err);
    return [];
  }
}

/**
 * Checks if current playback time falls inside any skippable segment.
 * If yes, returns the target second to jump to, otherwise null.
 */
export function getSkipTarget(
  segments: SkipSegment[],
  currentTime: number
): { targetSeconds: number; category: string } | null {
  for (const item of segments) {
    const [start, end] = item.segment;
    // Allow a small 0.5s margin so we catch it before or right at the start
    if (currentTime >= start - 0.2 && currentTime < end - 0.5) {
      return { targetSeconds: end, category: item.category };
    }
  }
  return null;
}
