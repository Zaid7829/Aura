import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur();
          usePlayerStore.getState().setIsSearchOpen(false);
        }
        return;
      }

      const playerState = usePlayerStore.getState();

      // Cmd+K or Ctrl+K -> Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playerState.setIsSearchOpen(!playerState.isSearchOpen);
        return;
      }

      // Search with '/' key
      if (e.key === '/') {
        e.preventDefault();
        playerState.setIsSearchOpen(true);
        return;
      }

      // Escape -> close any open modal
      if (e.key === 'Escape') {
        if (playerState.isSearchOpen) playerState.setIsSearchOpen(false);
        if (playerState.isShortcutsOpen) playerState.setIsShortcutsOpen(false);
        if (playerState.isVisualizerExpanded) playerState.setIsVisualizerExpanded(false);
        if (playerState.isQueueOpen) playerState.setIsQueueOpen(false);
        return;
      }

      // Space -> Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        playerState.togglePlay();
        return;
      }

      // Left Arrow -> Seek back 5s
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playerState.seek(Math.max(0, playerState.currentTime - 5));
        return;
      }

      // Right Arrow -> Seek forward 5s
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        playerState.seek(playerState.currentTime + 5);
        return;
      }

      // N -> Next Track
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        playerState.next();
        return;
      }

      // P -> Previous Track
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        playerState.previous();
        return;
      }

      // M -> Toggle Mute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        playerState.toggleMute();
        return;
      }

      // L -> Favorite current track
      if (e.key === 'l' || e.key === 'L') {
        if (playerState.currentTrack) {
          e.preventDefault();
          useLibraryStore.getState().toggleFavorite(playerState.currentTrack.id, playerState.currentTrack);
        }
        return;
      }

      // V -> Toggle Expanded Deck / Visualizer
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        playerState.toggleVisualizer();
        return;
      }

      // Q -> Toggle Queue Drawer
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        playerState.setIsQueueOpen(!playerState.isQueueOpen);
        return;
      }

      // ? -> Toggle Keyboard Shortcuts
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        playerState.setIsShortcutsOpen(!playerState.isShortcutsOpen);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
