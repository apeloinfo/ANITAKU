/**
 * Anify API Service
 * Primary provider for:
 * 1. Anime HLS video stream sources & subtitle tracks
 * 2. Light Novel chapter body text & volume indices
 * 3. Media ID mapping (AniList ID -> Anify ID / Providers)
 */

export interface AnifyStreamSource {
  url: string;
  quality: string;
  isM3U8?: boolean;
}

export interface AnifySubtitle {
  url: string;
  lang: string;
  label?: string;
  default?: boolean;
}

export interface AnifyStreamData {
  sources: AnifyStreamSource[];
  subtitles: AnifySubtitle[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  providerId: string;
  episodeNumber: number;
}

export interface AnifyEpisode {
  id: string; // watchId
  number: number;
  title?: string;
  image?: string;
  isFiller?: boolean;
  providerId: string;
}

export interface AnifyNovelChapter {
  id: string; // readId
  number: number;
  title: string;
  updatedAt?: number;
  providerId: string;
}

export interface AnifyNovelChapterContent {
  chapterNumber: number;
  title: string;
  content: string;
  paragraphs: string[];
  providerId: string;
}

const ANIFY_DIRECT_URL = 'https://api.anify.tv';

// In-memory cache for stream URLs & chapter content
const anifyCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchAnify<T>(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T | null> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      queryParams.append(key, String(val));
    }
  });
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cacheKey = `anify_${cleanEndpoint}_${queryString}`;

  const cached = anifyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Try server proxy first (avoids browser CORS & iframe limitations)
  try {
    const proxyUrl = `/api/anify/${cleanEndpoint}${queryString}`;
    const proxyRes = await fetch(proxyUrl, {
      headers: { Accept: 'application/json' },
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && !data.error) {
        anifyCache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      }
    }
  } catch {
    // Fall back to direct request
  }

  // 2. Direct request fallback
  try {
    const directUrl = `${ANIFY_DIRECT_URL}/${cleanEndpoint}${queryString}`;
    const directRes = await fetch(directUrl, {
      headers: { Accept: 'application/json' },
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data && !data.error) {
        anifyCache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

/**
 * Fetch Anime media info from Anify by AniList ID or Title
 */
export async function getAnifyAnimeInfo(anilistId: string | number, title?: string): Promise<any | null> {
  // First try direct ID mapping
  let data = await fetchAnify<any>(`info/${anilistId}`, { type: 'anime' });
  if (data && (data.id || data.episodes || data.mapping)) {
    return data;
  }

  // If not found and title provided, search Anify
  if (title) {
    const searchResults = await fetchAnify<any[]>('search', { query: title, type: 'anime' });
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      const bestMatch = searchResults[0];
      if (bestMatch?.id) {
        return await fetchAnify<any>(`info/${bestMatch.id}`, { type: 'anime' });
      }
    }
  }

  return null;
}

/**
 * Fetch Anime episodes list across available providers (gogoanime, zoro, etc.)
 */
export async function getAnifyEpisodes(anilistId: string | number, title?: string): Promise<AnifyEpisode[]> {
  const info = await getAnifyAnimeInfo(anilistId, title);
  if (!info) return [];

  const episodeList: AnifyEpisode[] = [];
  const seenEpisodeNumbers = new Set<number>();

  // Parse episodes array from providers
  if (Array.isArray(info.episodes)) {
    for (const providerGroup of info.episodes) {
      const providerId = providerGroup.providerId || providerGroup.id || 'gogoanime';
      const episodes = providerGroup.episodes || [];

      for (const ep of episodes) {
        const epNum = Number(ep.number);
        if (!isNaN(epNum) && !seenEpisodeNumbers.has(epNum)) {
          seenEpisodeNumbers.add(epNum);
          episodeList.push({
            id: ep.id || ep.watchId || String(epNum),
            number: epNum,
            title: ep.title || `Episode ${epNum}`,
            image: ep.img || ep.image,
            isFiller: Boolean(ep.isFiller),
            providerId,
          });
        }
      }
    }
  }

  // Sort by episode number ascending
  return episodeList.sort((a, b) => a.number - b.number);
}

/**
 * Fetch real HLS stream sources and subtitles for an episode
 */
export async function getAnimeStreamSources(
  anilistId: string | number,
  episodeNumber: number,
  options?: {
    providerId?: string;
    watchId?: string;
    subType?: 'sub' | 'dub';
    title?: string;
  }
): Promise<AnifyStreamData | null> {
  const subType = options?.subType || 'sub';

  // 1. If providerId and watchId are known, request directly
  if (options?.providerId && options?.watchId) {
    const rawSources = await fetchAnify<any>('sources', {
      providerId: options.providerId,
      watchId: options.watchId,
      episodeNumber,
      id: anilistId,
      subType,
    });

    if (rawSources && Array.isArray(rawSources.sources) && rawSources.sources.length > 0) {
      return formatStreamPayload(rawSources, options.providerId, episodeNumber);
    }
  }

  // 2. Discover episodes from Anify info
  const info = await getAnifyAnimeInfo(anilistId, options?.title);
  if (!info || !Array.isArray(info.episodes)) {
    return null;
  }

  const preferredProviders = ['gogoanime', 'zoro', '9anime', 'animepahe'];
  // Sort provider groups by preference
  const sortedProviderGroups = [...info.episodes].sort((a, b) => {
    const aIndex = preferredProviders.indexOf(a.providerId);
    const bIndex = preferredProviders.indexOf(b.providerId);
    const aRank = aIndex === -1 ? 99 : aIndex;
    const bRank = bIndex === -1 ? 99 : bIndex;
    return aRank - bRank;
  });

  for (const group of sortedProviderGroups) {
    const providerId = group.providerId || 'gogoanime';
    const ep = (group.episodes || []).find((e: any) => Number(e.number) === episodeNumber);
    if (ep) {
      const watchId = ep.id || ep.watchId;
      const rawSources = await fetchAnify<any>('sources', {
        providerId,
        watchId,
        episodeNumber,
        id: anilistId,
        subType,
      });

      if (rawSources && Array.isArray(rawSources.sources) && rawSources.sources.length > 0) {
        return formatStreamPayload(rawSources, providerId, episodeNumber);
      }
    }
  }

  return null;
}

function formatStreamPayload(raw: any, providerId: string, episodeNumber: number): AnifyStreamData {
  const sources: AnifyStreamSource[] = (raw.sources || []).map((s: any) => ({
    url: s.url,
    quality: s.quality || 'auto',
    isM3U8: Boolean(s.isM3U8 || s.url?.includes('.m3u8')),
  }));

  const subtitles: AnifySubtitle[] = (raw.subtitles || []).map((sub: any, idx: number) => ({
    url: sub.url,
    lang: sub.lang || sub.label || 'English',
    label: sub.label || sub.lang || 'English',
    default: idx === 0 || sub.lang?.toLowerCase().includes('english'),
  }));

  return {
    sources,
    subtitles,
    intro: raw.intro,
    outro: raw.outro,
    providerId,
    episodeNumber,
  };
}

/**
 * Fetch Light Novel info from Anify
 */
export async function getAnifyNovelInfo(anilistId: string | number, title?: string): Promise<any | null> {
  let data = await fetchAnify<any>(`info/${anilistId}`, { type: 'novel' });
  if (data && (data.id || data.chapters)) {
    return data;
  }

  if (title) {
    const searchResults = await fetchAnify<any[]>('search', { query: title, type: 'novel' });
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      const match = searchResults[0];
      if (match?.id) {
        return await fetchAnify<any>(`info/${match.id}`, { type: 'novel' });
      }
    }
  }

  return null;
}

/**
 * Fetch Light Novel chapters list
 */
export async function getAnifyNovelChapters(anilistId: string | number, title?: string): Promise<AnifyNovelChapter[]> {
  const info = await getAnifyNovelInfo(anilistId, title);
  if (!info || !Array.isArray(info.chapters)) return [];

  const chaptersList: AnifyNovelChapter[] = [];
  const seenChapters = new Set<number>();

  for (const providerGroup of info.chapters) {
    const providerId = providerGroup.providerId || providerGroup.id || 'novelupdates';
    const chapters = providerGroup.chapters || [];

    for (const ch of chapters) {
      const chNum = Number(ch.number);
      if (!isNaN(chNum) && !seenChapters.has(chNum)) {
        seenChapters.add(chNum);
        chaptersList.push({
          id: ch.id || ch.readId || String(chNum),
          number: chNum,
          title: ch.title || `Chapter ${chNum}`,
          updatedAt: ch.updatedAt,
          providerId,
        });
      }
    }
  }

  return chaptersList.sort((a, b) => a.number - b.number);
}

/**
 * Fetch real Light Novel Chapter raw body text & paragraphs via Anify API
 */
export async function getNovelChapterContent(
  anilistId: string | number,
  chapterNumber: number,
  options?: { providerId?: string; readId?: string; title?: string }
): Promise<AnifyNovelChapterContent | null> {
  // 1. Direct fetch if readId provided
  if (options?.providerId && options?.readId) {
    const rawContent = await fetchAnify<any>('read', {
      providerId: options.providerId,
      readId: options.readId,
      chapterNumber,
      id: anilistId,
    });

    if (rawContent) {
      return parseNovelContent(rawContent, options.providerId, chapterNumber);
    }
  }

  // 2. Discover from Novel Info
  const info = await getAnifyNovelInfo(anilistId, options?.title);
  if (!info || !Array.isArray(info.chapters)) return null;

  for (const group of info.chapters) {
    const providerId = group.providerId || 'novelupdates';
    const ch = (group.chapters || []).find((c: any) => Number(c.number) === chapterNumber);
    if (ch) {
      const readId = ch.id || ch.readId;
      const rawContent = await fetchAnify<any>('read', {
        providerId,
        readId,
        chapterNumber,
        id: anilistId,
      });

      if (rawContent) {
        return parseNovelContent(rawContent, providerId, chapterNumber, ch.title);
      }
    }
  }

  return null;
}

function parseNovelContent(raw: any, providerId: string, chapterNumber: number, defaultTitle?: string): AnifyNovelChapterContent {
  let text = '';
  let paragraphs: string[] = [];

  if (typeof raw === 'string') {
    text = raw;
  } else if (typeof raw.content === 'string') {
    text = raw.content;
  } else if (Array.isArray(raw.paragraphs)) {
    paragraphs = raw.paragraphs;
    text = paragraphs.join('\n\n');
  } else if (raw.text) {
    text = raw.text;
  }

  // Clean HTML markup from raw text
  const cleaned = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();

  if (paragraphs.length === 0 && cleaned) {
    paragraphs = cleaned
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  return {
    chapterNumber,
    title: raw.title || defaultTitle || `Chapter ${chapterNumber}`,
    content: cleaned,
    paragraphs,
    providerId,
  };
}
