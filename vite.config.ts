import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function youtubeSearchPlugin(): Plugin {
  return {
    name: 'youtube-search-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/yt-search')) {
          const url = new URL(req.url, 'http://localhost');
          const query = url.searchParams.get('q');
          if (!query) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing query parameter q' }));
            return;
          }

          try {
            const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`;
            const response = await fetch(ytUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            const html = await response.text();
            const match =
              html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
              html.match(/ytInitialData\s*=\s*({.*?});/s);

            if (!match) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ results: [] }));
              return;
            }

            const data = JSON.parse(match[1]);
            const contents =
              data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
                ?.contents?.[0]?.itemSectionRenderer?.contents || [];

            const results = [];
            for (const item of contents) {
              if (item.videoRenderer) {
                const vr = item.videoRenderer;
                const id = vr.videoId;
                if (!id) continue;
                const title = vr.title?.runs?.[0]?.text || '';
                const artist = vr.ownerText?.runs?.[0]?.text || '';
                const durationText = vr.lengthText?.simpleText || '0:00';
                const parts = durationText.split(':').map(Number);
                let durationSec = 180;
                if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
                else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];

                const thumbs = vr.thumbnail?.thumbnails || [];
                const thumbnail =
                  thumbs[thumbs.length - 1]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

                results.push({
                  id,
                  title,
                  artist,
                  duration: durationSec,
                  durationText,
                  thumbnail,
                });
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results }));
          } catch (err) {
            console.error('YouTube search error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to search YouTube', results: [] }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    youtubeSearchPlugin(),
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('zustand') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
          }
        },
      },
    },
  },
})
