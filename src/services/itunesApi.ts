import type { Track, Album, Artist, Genre, Mood } from '../types/music';

interface iTunesResult {
  trackId?: number;
  collectionId?: number;
  artistId?: number;
  trackName?: string;
  artistName?: string;
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
    const timeoutId = setTimeout(() => controller.abort(), 2500);

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
      .filter((item) => Boolean(item.trackName && item.artistName))
      .map((item, index) => {
        const genre = mapGenre(item.primaryGenreName);
        const mood = mapMood(genre);
        // Transform 100x100 to 600x600 high res album art on Apple CDN
        const highResCover = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
          : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop';

        return {
          id: `itunes-${item.trackId || index}`,
          title: item.trackName || 'Untitled Track',
          artist: item.artistName || 'Unknown Artist',
          artistId: item.artistId ? `artist-${item.artistId}` : undefined,
          album: item.collectionName || 'Single Edition',
          albumId: item.collectionId ? `album-${item.collectionId}` : undefined,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210,
          audioUrl: item.previewUrl || '',
          coverUrl: highResCover,
          genre,
          mood,
          tags: ['Full Audio', item.primaryGenreName || 'Studio Master', mood],
          curatorNote: `Official studio recording via Apple Music (${item.artistName} - ${item.collectionName || 'Single'}).`,
          releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '2024-01-01',
          license: 'Standard Commercial Music',
          waveform: [25, 45, 70, 85, 90, 75, 60, 40, 55, 75, 90, 80, 60, 45, 30, 20],
          playsCount: 50000 + index * 1200,
        };
      });
  } catch (err) {
    console.warn('iTunes search error:', err);
    return [];
  }
}

export async function searchAppleMusicAlbums(query: string, limit = 6): Promise<Album[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      trimmed
    )}&entity=album&limit=${limit}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data: iTunesSearchResponse = await res.json();
    if (!data.results || data.results.length === 0) return [];

    return data.results.map((item, index) => {
      const highResCover = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop';

      return {
        id: `album-${item.collectionId || index}`,
        title: item.collectionName || 'Archive Edition',
        artist: item.artistName || 'Various Artists',
        year: item.releaseDate ? item.releaseDate.split('-')[0] : '2024',
        coverUrl: highResCover,
        genre: mapGenre(item.primaryGenreName),
        curatorEssay: `Full release from ${item.artistName}. Preserved on Apple CDN.`,
        tracks: [],
      };
    });
  } catch {
    return [];
  }
}

export async function searchAppleMusicArtists(query: string, limit = 4): Promise<Artist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      trimmed
    )}&entity=musicArtist&limit=${limit}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data: iTunesSearchResponse = await res.json();
    if (!data.results || data.results.length === 0) return [];

    return data.results.map((item, index) => {
      return {
        id: `artist-${item.artistId || index}`,
        name: item.artistName || 'Artist',
        bio: `Recording artist indexed in global catalog.`,
        artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
        genre: mapGenre(item.primaryGenreName),
        popularity: 80,
      };
    });
  } catch {
    return [];
  }
}
