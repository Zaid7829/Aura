/**
 * Lyrics Service
 * Fetches time-synchronized and plain lyrics using LRCLIB API.
 * Supports synchronized line-by-line highlight during music playback.
 */

export interface SyncedLyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  plainLyrics: string;
  syncedLines: SyncedLyricLine[];
  hasSync: boolean;
}

const lyricsCache = new Map<string, LyricsData | null>();

export async function fetchTrackLyrics(title: string, artist: string): Promise<LyricsData | null> {
  const cleanTitle = title
    .replace(/\((Official|Lyric|Audio|HQ|HD|Video|Remastered)[^)]*\)/gi, '')
    .replace(/\[(Official|Lyric|Audio|HQ|HD|Video|Remastered)[^\]]*\]/gi, '')
    .trim();

  const cleanArtist = artist
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  const cacheKey = `${cleanTitle.toLowerCase()}:::${cleanArtist.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey) || null;
  }

  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
      cleanArtist
    )}&track_name=${encodeURIComponent(cleanTitle)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      lyricsCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    const plainLyrics = (data.plainLyrics || '').trim();
    const rawSynced = (data.syncedLyrics || '').trim();

    const syncedLines: SyncedLyricLine[] = [];
    if (rawSynced) {
      const lines = rawSynced.split('\n');
      for (const line of lines) {
        const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const fraction = parseFloat(`0.${match[3]}`);
          const time = minutes * 60 + seconds + fraction;
          const text = match[4].trim();
          if (text) {
            syncedLines.push({ time, text });
          }
        }
      }
    }

    const result: LyricsData = {
      plainLyrics: plainLyrics || (syncedLines.length > 0 ? syncedLines.map((l) => l.text).join('\n') : ''),
      syncedLines,
      hasSync: syncedLines.length > 0,
    };

    lyricsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Lyrics fetch error:', err);
    lyricsCache.set(cacheKey, null);
    return null;
  }
}

