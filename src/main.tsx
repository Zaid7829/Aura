import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Lock mobile viewport resolution & prevent pinch or double-tap zoom on phones
if (typeof window !== 'undefined') {
  // Prevent iOS gesture zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Prevent multi-touch pinch zoom
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent rapid double-tap zoom while preserving button clicks
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isInteractive = target?.closest('button, a, input, [role="button"], [role="slider"]');
      if (now - lastTouchEnd <= 300 && !isInteractive) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
