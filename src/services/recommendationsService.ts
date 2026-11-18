import type { Track } from '../types/music';
import { searchYouTubeTracks } from './youtubeSearch';
import { CURATED_TRACKS } from './mockCatalog';

const recsCache = new Map<string, Track[]>();

export async function fetchSimilarRecommendations(track: Track, limit = 8): Promise<Track[]> {
  const cacheKey = track.id;
  if (recsCache.has(cacheKey)) {
    return recsCache.get(cacheKey)!;
  }

  try {
    // 1. Try querying similar tracks based on artist & genre
    const query = `${track.artist} similar music`;
    const results = await searchYouTubeTracks(query, limit + 3);

    const filtered = results.filter(
      (t) => t.id !== track.id && t.title.toLowerCase() !== track.title.toLowerCase()
    );

    if (filtered.length > 0) {
      const topRecs = filtered.slice(0, limit);
      recsCache.set(cacheKey, topRecs);
      return topRecs;
    }
  } catch (err) {
    console.warn('Recommendation fetch error:', err);
  }

  // Fallback: match by mood and genre from curated catalog
  const fallback = CURATED_TRACKS.filter(
    (t) => t.id !== track.id && (t.genre === track.genre || t.mood === track.mood)
  ).slice(0, limit);

  recsCache.set(cacheKey, fallback.length > 0 ? fallback : CURATED_TRACKS.slice(0, limit));
  return recsCache.get(cacheKey)!;
}

