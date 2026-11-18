/**
 * Artwork & Multi-CDN Utility
 * Optimizes and resolves cover art from Spotify, Apple Music, and YouTube CDNs.
 */

export function getYouTubeThumbnail(videoId: string, quality: 'max' | 'hq' | 'mq' = 'max'): string {
  if (!videoId) return '';
  if (quality === 'max') {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  if (quality === 'hq') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function getAppleMusicArtwork(url: string, size = 600): string {
  if (!url || !url.includes('mzstatic.com')) return url;
  return url.replace(/\d+x\d+bb\.jpg/, `${size}x${size}bb.jpg`);
}

export function isSpotifyCdn(url: string): boolean {
  return url.includes('i.scdn.co') || url.includes('charts-images.scdn.co');
}

export function getOptimalArtwork(track: {
  coverUrl?: string;
  youtubeId?: string;
}): string {
  if (track.coverUrl) {
    if (track.coverUrl.includes('mzstatic.com')) {
      return getAppleMusicArtwork(track.coverUrl, 600);
    }
    return track.coverUrl;
  }
  if (track.youtubeId) {
    return getYouTubeThumbnail(track.youtubeId, 'max');
  }
  return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop';
}
