import type { Track, Genre, Mood } from '../types/music';

interface iTunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
}

interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesResult[];
}

function mapGenre(genreName?: string): Genre {
  if (!genreName) return 'Ambient';
  const g = genreName.toLowerCase();
  if (g.includes('ambient') || g.includes('new age')) return 'Ambient';
  if (g.includes('electronic') || g.includes('dance')) return 'Electronic';
  if (g.includes('classical') || g.includes('soundtrack')) return 'Neo-Classical';
  if (g.includes('jazz')) return 'Jazz Fusion';
  if (g.includes('rock') || g.includes('alternative')) return 'Post-Rock';
  return 'Downtempo';
}

function mapMood(genre: Genre): Mood {
  switch (genre) {
    case 'Ambient':
      return 'Deep Focus';
    case 'Neo-Classical':
      return 'Meditative';
    case 'Electronic':
      return 'Hypnotic';
    case 'Jazz Fusion':
      return 'Late Night';
    default:
      return 'Urban Drift';
  }
}

export async function searchAppleMusicTracks(query: string, limit = 15): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      trimmed
    )}&entity=song&limit=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`iTunes API returned ${res.status}`);
    }

    const data: iTunesSearchResponse = await res.json();
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results
      .filter((item) => Boolean(item.previewUrl))
      .map((item, index) => {
        const genre = mapGenre(item.primaryGenreName);
        const mood = mapMood(genre);
        // Transform 100x100 to 600x600 high res album art
        const highResCover = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
          : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop';

        return {
          id: `itunes-${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || 'Single',
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
          audioUrl: item.previewUrl!,
          coverUrl: highResCover,
          genre,
          mood,
          tags: ['Apple Music Preview', item.primaryGenreName || 'Popular', mood],
          curatorNote: `High-fidelity AAC preview stream served directly from Apple Content Delivery Network (${item.artistName} - ${item.collectionName || 'Single'}).`,
          releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '2024-01-01',
          license: 'Standard Commercial (Preview)',
          waveform: [25, 45, 70, 85, 90, 75, 60, 40, 55, 75, 90, 80, 60, 45, 30, 20],
          playsCount: 50000 + index * 1200,
        };
      });
  } catch (err) {
    console.warn('iTunes search error:', err);
    return [];
  }
}

