/**
 * YouTube Search Suggestions Service
 * Uses YouTube's public complete search API via JSONP
 * Provides real-time autocomplete search suggestions without CORS restrictions.
 */

let callbackCounter = 0;

export async function fetchSearchSuggestions(query: string, limit = 6): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  return new Promise((resolve) => {
    callbackCounter += 1;
    const callbackName = `__yt_suggestions_${Date.now()}_${callbackCounter}`;
    const script = document.createElement('script');

    let isHandled = false;

    // Safety timeout in case of network issues
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 1500);

    const cleanup = () => {
      if (isHandled) return;
      isHandled = true;
      clearTimeout(timeoutId);
      try {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        delete (window as unknown as Record<string, unknown>)[callbackName];
      } catch {
        // Ignore cleanup errors
      }
    };

    // Global JSONP callback
    (window as unknown as Record<string, (data: unknown) => void>)[callbackName] = (data: unknown) => {
      cleanup();
      try {
        if (Array.isArray(data) && Array.isArray(data[1])) {
          const suggestions = (data[1] as [string, ...unknown[]][])
            .map((item) => (Array.isArray(item) ? item[0] : ''))
            .filter((str): str is string => typeof str === 'string' && str.trim().length > 0)
            .slice(0, limit);
          resolve(suggestions);
          return;
        }
      } catch (err) {
        console.warn('Error parsing YouTube suggestions:', err);
      }
      resolve([]);
    };

    script.onerror = () => {
      cleanup();
      resolve([]);
    };

    script.src = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&jsonp=${callbackName}&q=${encodeURIComponent(
      trimmed
    )}`;
    script.async = true;

    document.head.appendChild(script);
  });
}
