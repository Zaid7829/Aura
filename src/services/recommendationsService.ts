import type { Track, Genre, Mood } from '../types/music';
import { CURATED_TRACKS } from './mockCatalog';
import { searchAppleMusicTracks } from './itunesApi';

const recsCache = new Map<string, Track[]>();

// Genre affinity map for acoustic similarity (Chosic algorithm)
const GENRE_AFFINITIES: Record<Genre, Genre[]> = {
  Ambient: ['Lo-Fi', 'Neo-Classical', 'Minimalism', 'Downtempo', 'Modular'],
  'Lo-Fi': ['Ambient', 'Downtempo', 'Jazz Fusion', 'Indie'],
  'Neo-Classical': ['Ambient', 'Minimalism', 'Post-Rock'],
  Electronic: ['Downtempo', 'Post-Rock', 'Ambient', 'Modular'],
  'Jazz Fusion': ['Lo-Fi', 'Downtempo', 'Ambient'],
  Downtempo: ['Ambient', 'Lo-Fi', 'Electronic', 'Jazz Fusion'],
  Minimalism: ['Ambient', 'Neo-Classical', 'Lo-Fi', 'Modular'],
  'Post-Rock': ['Neo-Classical', 'Electronic', 'Ambient', 'Indie'],
  Indie: ['Post-Rock', 'Lo-Fi', 'Ambient'],
  Modular: ['Ambient', 'Electronic', 'Minimalism'],
};

// Mood compatibility map
const MOOD_COMPATIBILITY: Record<Mood, Mood[]> = {
  'Late Night': ['Deep Focus', 'Warm & Analog', 'Urban Drift'],
  'Deep Focus': ['Late Night', 'Meditative', 'Hypnotic'],
  Hypnotic: ['Deep Focus', 'Late Night', 'Ethereal'],
  Melancholic: ['Meditative', 'Ethereal', 'Deep Focus'],
  Ethereal: ['Melancholic', 'Hypnotic', 'Meditative'],
  'Warm & Analog': ['Late Night', 'Deep Focus', 'Urban Drift'],
  Meditative: ['Deep Focus', 'Ethereal', 'Melancholic'],
  'Urban Drift': ['Late Night', 'Warm & Analog', 'Hypnotic'],
};

/**
 * Calculates acoustic similarity score between seed track and candidate
 * Modeled after Chosic's song similarity and Spotify acoustic attributes.
 */
function calculateChosicSimilarity(seed: Track, candidate: Track): number {
  if (seed.id === candidate.id) return -1;
  if (seed.title.trim().toLowerCase() === candidate.title.trim().toLowerCase()) return -1;

  let score = 0;

  // 1. Genre affinity (+45 for exact, +25 for compatible)
  if (seed.genre === candidate.genre) {
    score += 45;
  } else if (GENRE_AFFINITIES[seed.genre]?.includes(candidate.genre)) {
    score += 25;
  }

  // 2. Mood compatibility (+30 for exact, +15 for compatible)
  if (seed.mood === candidate.mood) {
    score += 30;
  } else if (MOOD_COMPATIBILITY[seed.mood]?.includes(candidate.mood)) {
    score += 15;
  }

  // 3. Tempo (BPM) proximity
  if (seed.bpm && candidate.bpm) {
    const bpmDiff = Math.abs(seed.bpm - candidate.bpm);
    if (bpmDiff <= 6) score += 20;
    else if (bpmDiff <= 15) score += 12;
    else if (bpmDiff <= 25) score += 5;
  }

  // 4. Musical Key match
  if (seed.musicalKey && candidate.musicalKey && seed.musicalKey === candidate.musicalKey) {
    score += 15;
  }

  // 5. Sonic Tag overlap (+8 per matching tag)
  if (seed.tags && candidate.tags) {
    const seedTagSet = new Set(seed.tags.map((t) => t.toLowerCase()));
    for (const tag of candidate.tags) {
      if (seedTagSet.has(tag.toLowerCase())) {
        score += 8;
      }
    }
  }

  // 6. Bonus for same artist (deeper catalog exploration)
  if (seed.artist && candidate.artist && seed.artist.toLowerCase() === candidate.artist.toLowerCase()) {
    score += 10;
  }

  return score;
}

export async function fetchSimilarRecommendations(track: Track, limit = 8): Promise<Track[]> {
  const cacheKey = track.id;
  if (recsCache.has(cacheKey)) {
    return recsCache.get(cacheKey)!;
  }

  const candidatePool: Track[] = [...CURATED_TRACKS];

  // Try fetching additional live candidates from iTunes similarity search with 1.5s timeout
  try {
    const searchTerms = [
      `${track.artist}`,
      `${track.genre} ${track.mood}`,
    ];

    const results = await Promise.allSettled(
      searchTerms.map((term) => searchAppleMusicTracks(term, 8))
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (!candidatePool.some((c) => c.id === item.id || c.title.toLowerCase() === item.title.toLowerCase())) {
            candidatePool.push(item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Remote similarity fetch error:', err);
  }

  // Score all candidates using Chosic acoustic similarity algorithm
  const scored = candidatePool
    .map((candidate) => ({
      track: candidate,
      score: calculateChosicSimilarity(track, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topRecs = scored.slice(0, limit).map((s) => s.track);

  // If candidate pool didn't yield enough, pad with curated tracks
  if (topRecs.length < limit) {
    for (const c of CURATED_TRACKS) {
      if (c.id !== track.id && !topRecs.some((t) => t.id === c.id)) {
        topRecs.push(c);
        if (topRecs.length >= limit) break;
      }
    }
  }

  recsCache.set(cacheKey, topRecs);
  return topRecs;
}
