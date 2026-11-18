/**
 * YouTube IFrame Player Service
 * Controls background/full-length YouTube audio and video playback
 * seamlessly integrated with Aura's unified Player Store.
 */

import { fetchSkipSegments, getSkipTarget, type SkipSegment } from './sponsorBlock';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  loadVideoById: (options: { videoId: string; startSeconds?: number } | string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

type YouTubeStateCallback = (state: {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
}) => void;

class YouTubePlayerService {
  private player: YTPlayerInstance | null = null;
  private isApiReady = false;
  private isInitializing = false;
  private currentVideoId: string | null = null;
  private updateInterval: number | null = null;

  private onStateChange: YouTubeStateCallback | null = null;
  private onEnded: (() => void) | null = null;
  private activeSegments: SkipSegment[] = [];

  private pendingPlayRequest: { videoId: string; startTime: number } | null = null;

  constructor() {
    this.ensureContainer();
  }

  private ensureContainer(): HTMLElement {
    let container = document.getElementById('aura-yt-player-host');
    if (!container) {
      container = document.createElement('div');
      container.id = 'aura-yt-player-host';
      // Kept rendered with non-zero dimensions off-screen so browsers do not suspend audio playback
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '240px';
      container.style.height = '180px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-1000';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);

      const playerDiv = document.createElement('div');
      playerDiv.id = 'aura-yt-player-target';
      container.appendChild(playerDiv);
    }
    return container;
  }

  private initApi(): Promise<void> {
    if (this.isApiReady && this.player) {
      return Promise.resolve();
    }

    if (this.isInitializing) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.isApiReady && this.player) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.isInitializing = true;
    this.ensureContainer();

    return new Promise((resolve) => {
      const onReady = () => {
        this.player = new window.YT.Player('aura-yt-player-target', {
          height: '180',
          width: '240',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              this.isApiReady = true;
              this.isInitializing = false;
              this.player = event.target;
              if (this.pendingPlayRequest) {
                const req = this.pendingPlayRequest;
                this.pendingPlayRequest = null;
                this.loadAndPlay(req.videoId, req.startTime);
              }
              resolve();
            },
            onStateChange: (event) => {
              this.handleStateChange(event.data);
            },
            onError: (err) => {
              console.warn('YouTube Player error encountered:', err);
              if (this.onEnded) this.onEnded();
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        onReady();
      } else {
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          onReady();
        };

        if (!document.getElementById('aura-yt-api-script')) {
          const script = document.createElement('script');
          script.id = 'aura-yt-api-script';
          script.src = 'https://www.youtube.com/iframe_api';
          script.async = true;
          document.head.appendChild(script);
        }
      }
    });
  }

  private handleStateChange(stateCode: number) {
    if (!this.player) return;

    const YTState = window.YT?.PlayerState;
    if (!YTState) return;

    if (stateCode === YTState.PLAYING) {
      this.startPolling();
      this.notify(true, false);
    } else if (stateCode === YTState.PAUSED) {
      this.stopPolling();
      this.notify(false, false);
    } else if (stateCode === YTState.BUFFERING) {
      this.notify(true, true);
    } else if (stateCode === YTState.ENDED) {
      this.stopPolling();
      this.notify(false, false);
      if (this.onEnded) this.onEnded();
    }
  }

  private startPolling() {
    this.stopPolling();
    this.updateInterval = window.setInterval(() => {
      this.notify(true, false);
    }, 250);
  }

  private stopPolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private notify(isPlaying: boolean, isLoading: boolean) {
    if (!this.player || !this.onStateChange) return;
    try {
      const currentTime = this.player.getCurrentTime() || 0;
      const duration = this.player.getDuration() || 0;

      // SponsorBlock Auto-Skip check
      if (this.activeSegments.length > 0 && isPlaying) {
        const skip = getSkipTarget(this.activeSegments, currentTime);
        if (skip) {
          this.seek(skip.targetSeconds);
          return;
        }
      }

      this.onStateChange({
        currentTime,
        duration,
        isPlaying,
        isLoading,
      });
    } catch {
      // Ignore poll during transient state changes
    }
  }

  public setCallbacks(callbacks: {
    onStateChange: YouTubeStateCallback;
    onEnded: () => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onEnded = callbacks.onEnded;
  }

  public async loadAndPlay(videoId: string, startTime = 0): Promise<void> {
    this.currentVideoId = videoId;
    this.activeSegments = [];
    fetchSkipSegments(videoId).then((segs) => {
      if (this.currentVideoId === videoId) {
        this.activeSegments = segs;
      }
    });

    if (!this.isApiReady || !this.player) {
      this.pendingPlayRequest = { videoId, startTime };
      await this.initApi();
      return;
    }

    try {
      this.player.loadVideoById({
        videoId,
        startSeconds: startTime,
      });
      this.player.playVideo();
    } catch (err) {
      console.warn('Failed to load YouTube video:', err);
    }
  }

  public play() {
    if (this.player && this.isApiReady) {
      try {
        this.player.playVideo();
      } catch (err) {
        console.warn('YouTube play error:', err);
      }
    }
  }

  public pause() {
    if (this.player && this.isApiReady) {
      try {
        this.player.pauseVideo();
      } catch (err) {
        console.warn('YouTube pause error:', err);
      }
    }
  }

  public seek(seconds: number) {
    if (this.player && this.isApiReady) {
      try {
        this.player.seekTo(seconds, true);
        this.notify(true, false);
      } catch (err) {
        console.warn('YouTube seek error:', err);
      }
    }
  }

  public setVolume(vol: number) {
    if (this.player && this.isApiReady) {
      try {
        this.player.setVolume(Math.round(vol * 100));
      } catch (err) {
        console.warn('YouTube volume error:', err);
      }
    }
  }

  public getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  public getActiveSegments(): SkipSegment[] {
    return this.activeSegments;
  }
}

export const youtubePlayerService = new YouTubePlayerService();
