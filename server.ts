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
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const targetUrl = `https://api.anify.tv/${targetPath}${queryString ? '?' + queryString : ''}`;

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

  // API Proxy for MangaDex
  app.get('/api/mangadex/*', async (req, res) => {
    try {
      const targetPath = req.params[0] || '';
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const targetUrl = `https://api.mangadex.org/${targetPath}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

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
