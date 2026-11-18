export default async function handler(req: any, res: any) {
  // Support both Node/Express res and standard web Request/Response
  let query = '';
  if (req.query?.q) {
    query = req.query.q;
  } else if (req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      query = url.searchParams.get('q') || '';
    } catch {
      query = '';
    }
  }

  if (!query) {
    if (res.status) {
      return res.status(400).json({ error: 'Missing query parameter q', results: [] });
    }
    return new Response(JSON.stringify({ error: 'Missing query parameter q', results: [] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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
      if (res.json) return res.status(200).json({ results: [] });
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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

    if (res.setHeader && res.json) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ results });
    }
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    if (res.json) {
      return res.status(500).json({ error: 'Failed to search YouTube', message: err?.message, results: [] });
    }
    return new Response(
      JSON.stringify({ error: 'Failed to search YouTube', message: err?.message, results: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
