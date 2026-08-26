import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory server cache for AniList GraphQL to reduce rate-limits and survive transient network glitches
  const serverAniListCache = new Map<string, { data: any; timestamp: number }>();
  const SERVER_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  // API Proxy for AniList GraphQL (bypasses browser CORS & iframe network restrictions with retry + cache)
  app.post('/api/anilist', async (req, res) => {
    const { query, variables } = req.body;
    const cacheKey = JSON.stringify({ query, variables });

    // Check server cache first
    const cached = serverAniListCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL) {
      return res.json(cached.data);
    }

    // Helper for resilient fetch with retries and timeout
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (response.status === 429) {
          // Rate limited: wait a moment and retry or fallback to cache
          if (cached) {
            return res.json(cached.data);
          }
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 600 * attempt));
            continue;
          }
        }

        if (contentType.includes('application/json') || text.trim().startsWith('{')) {
          try {
            const data = JSON.parse(text);
            if (response.ok && data) {
              serverAniListCache.set(cacheKey, { data, timestamp: Date.now() });
              return res.status(response.status).json(data);
            }
            if (data) {
              return res.status(response.status).json(data);
            }
          } catch {
            // JSON parse failed, retry
          }
        }

        if (response.status >= 500 && attempt < 3) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
          continue;
        }

        return res.status(response.status >= 400 ? response.status : 502).json({
          error: 'AniList returned unexpected response',
          status: response.status,
        });
      } catch (err: any) {
        lastError = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
        }
      }
    }

    // If all attempts failed but we have stale cache, serve it
    if (cached) {
      return res.json(cached.data);
    }

    return res.status(502).json({
      error: 'Failed to reach AniList API after retries',
      message: lastError?.message || 'Network fetch failure',
    });
  });

  // API Proxy for Anify (Anime HLS streams, Novel reader, mapping)
  app.get('/api/anify/*', async (req, res) => {
    try {
      const targetPath = req.params[0] || '';
      const rawQuery = req.url.includes('?') ? req.url.substring(req.url.indexOf('?') + 1) : '';
      const targetUrl = `https://api.anify.tv/${targetPath}${rawQuery ? '?' + rawQuery : ''}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        return res.status(response.status >= 400 ? response.status : 502).json({
          error: 'Anify returned non-JSON response',
          status: response.status,
        });
      }

      try {
        const data = JSON.parse(text);
        return res.status(response.status).json(data);
      } catch {
        return res.status(502).json({ error: 'Failed to parse Anify response JSON' });
      }
    } catch (error: any) {
      console.warn('Server Anify proxy notice:', error?.message || error);
      return res.status(502).json({ error: 'Failed to proxy request to Anify API', message: error?.message });
    }
  });

  // API Proxy for MangaDex (Preserves array and nested query parameters)
  app.get('/api/mangadex/*', async (req, res) => {
    try {
      const subPath = req.originalUrl.replace(/^\/api\/mangadex\/?/, '');
      const targetUrl = `https://api.mangadex.org/${subPath}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        return res.status(response.status >= 400 ? response.status : 502).json({
          error: 'MangaDex returned non-JSON response',
          status: response.status,
        });
      }

      try {
        const data = JSON.parse(text);
        return res.status(response.status).json(data);
      } catch {
        return res.status(502).json({ error: 'Failed to parse MangaDex response JSON' });
      }
    } catch (error: any) {
      console.warn('Server MangaDex proxy notice:', error?.message || error);
      return res.status(500).json({ error: 'Failed to proxy request to MangaDex' });
    }
  });

  // Safe Image Proxy for bypassing external CORS / Hotlink Protections
  app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing image url');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    const urlsToTry = [imageUrl];

    // If it's a MangaDex at-home node URL, add the canonical uploads.mangadex.org fallback
    if (imageUrl.includes('mangadex.network/data') || imageUrl.includes('mangadex.network/data-saver')) {
      const match = imageUrl.match(/\/(data(?:-saver)?\/[a-f0-9]+\/[^?#]+)/i);
      if (match && match[1]) {
        urlsToTry.push(`https://uploads.mangadex.org/${match[1]}`);
      }
    }

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mangadex.org/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (err: any) {
        console.warn('Image proxy attempt failed for url:', url, err?.message);
      }
    }

    return res.status(502).send('Failed to fetch remote image');
  });

  // API Proxy for Multi-Provider Anime Video Streams & Consumet Scrapers
  app.get('/api/anime/sources', async (req, res) => {
    const { title, episode, subType = 'sub' } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'Anime title is required' });
    }

    const cleanTitle = String(title)
      .toLowerCase()
      .replace(/\s*\(tv\)/gi, '')
      .replace(/\s*\(season\s*\d+\)/gi, '')
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, '-');

    const epNum = Number(episode) || 1;

    // List of dynamic public stream provider APIs to query in succession
    const providers = [
      `https://api-consumet-org-six.vercel.app/anime/gogoanime/watch/${cleanTitle}-episode-${epNum}`,
      `https://api.consumet.org/anime/gogoanime/watch/${cleanTitle}-episode-${epNum}`,
      `https://api-consumet.fly.dev/anime/gogoanime/watch/${cleanTitle}-episode-${epNum}`,
      `https://api.amvstr.me/api/v2/stream/${cleanTitle}/${epNum}`,
    ];

    for (const url of providers) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const apiRes = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && Array.isArray(data.sources) && data.sources.length > 0) {
            return res.json({
              sources: data.sources,
              subtitles: data.subtitles || [],
              intro: data.intro,
              outro: data.outro,
              provider: 'Consumet Multi-Mirror',
            });
          }
        }
      } catch {
        // Continue to next provider
      }
    }

    return res.status(404).json({ error: 'No stream available from public scrapers' });
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
