import type { Track } from '../types/music';

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationText: string;
  thumbnail: string;
}

export async function searchYouTubeTracks(query: string, limit = 15): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) {
      throw new Error(`YouTube search returned status ${res.status}`);
    }

    const data: { results: YouTubeSearchResult[] } = await res.json();
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.slice(0, limit).map((item, index) => {
      // Clean up common YouTube video titles like "Artist - Title (Official Video)"
      let cleanTitle = item.title;
      let cleanArtist = item.artist || 'YouTube Artist';

      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        cleanArtist = parts[0].trim();
        cleanTitle = parts.slice(1).join(' - ').trim();
      }

      // Remove bracketed noise like (Official Video), [HQ Audio], etc.
      cleanTitle = cleanTitle
        .replace(/\((Official|Lyric|Audio|HQ|HD|Remastered|Video|Visualizer)[^)]*\)/gi, '')
        .replace(/\[(Official|Lyric|Audio|HQ|HD|Remastered|Video|Visualizer)[^\]]*\]/gi, '')
        .trim();

      return {
        id: `yt-${item.id}`,
        title: cleanTitle || item.title,
        artist: cleanArtist,
        album: 'YouTube Full Audio',
        duration: item.duration || 210,
        audioUrl: `https://www.youtube.com/watch?v=${item.id}`,
        coverUrl: item.thumbnail,
        genre: 'Electronic',
        mood: 'Late Night',
        tags: ['YouTube Stream', 'Full Track', item.durationText],
        curatorNote: `Full-length YouTube track (${item.durationText}) streamed with native controls.`,
        releaseDate: new Date().toISOString().split('T')[0],
        license: 'Standard YouTube License',
        youtubeId: item.id,
        waveform: [35, 55, 75, 80, 95, 85, 70, 60, 75, 90, 85, 65, 45, 30, 20],
        playsCount: 250000 + index * 4500,
      };
    });
  } catch (err) {
    console.warn('YouTube search API error:', err);
    return [];
  }
}

