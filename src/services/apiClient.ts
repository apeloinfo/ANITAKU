import { MediaItem, Character, ScheduleDay, FilterOptions, MediaCategory } from '../types';

const ANILIST_URL = 'https://graphql.anilist.co';
const MANGADEX_URL = 'https://api.mangadex.org';

// In-memory cache to prevent excessive requests and smooth out UI
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchFromAniList<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const cacheKey = `anilist_${JSON.stringify({ query, variables })}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Try server-side proxy first (bypasses browser CORS & iframe limitations)
  try {
    const proxyResponse = await fetch('/api/anilist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (proxyResponse.ok) {
      const text = await proxyResponse.text();
      if (text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        if (json && json.data) {
          cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
          return json.data;
        }
      }
    }
  } catch {
    // If proxy failed, fall back to direct request
  }

  // 2. Direct request to AniList GraphQL API as fallback
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.ok) {
      const text = await response.text();
      if (text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        if (json && json.data) {
          cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
          return json.data;
        }
      }
    }
  } catch {
    // Fallback gracefully
  }

  // 3. If cache exists (even expired), return cached data
  if (cached) {
    return cached.data;
  }

  // 4. Return safe empty object so components don't crash
  return { Page: { media: [], pageInfo: { total: 0 } } } as unknown as T;
}

// Clean HTML tags from AniList descriptions
function cleanDescription(desc?: string | null): string {
  if (!desc) return 'No synopsis available.';
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

/**
 * Dynamic Deduplication Engine
 * Enforces unique ID normalization across state mappers and prevents duplicate cards
 */
export function deduplicateMediaItems(items: MediaItem[]): MediaItem[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, MediaItem>();
  for (const item of items) {
    if (item && item.id) {
      const idStr = String(item.id).trim();
      if (!map.has(idStr)) {
        map.set(idStr, item);
      }
    }
  }
  return Array.from(map.values());
}

// Map AniList Media object to MediaItem
function mapAniListToMediaItem(media: any, categoryOverride?: MediaCategory): MediaItem {
  let category: MediaCategory = categoryOverride || 'anime';
  if (!categoryOverride) {
    if (media.type === 'MANGA') {
      category = media.format === 'NOVEL' ? 'novel' : 'manga';
    } else {
      category = 'anime';
    }
  }

  const titleEnglish = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Untitled';
  const titleRomaji = media.title?.romaji || media.title?.native || titleEnglish;
  const titleNative = media.title?.native;

  // Characters
  const characters: Character[] = (media.characters?.edges || []).map((edge: any) => {
    const node = edge.node;
    const voiceActorNode = edge.voiceActors?.[0];
    return {
      id: String(node.id),
      name: node.name?.full || node.name?.userPreferred || 'Unknown Character',
      nativeName: node.name?.native,
      image: node.image?.large || node.image?.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
      role: edge.role === 'MAIN' ? 'Main Character' : 'Supporting Character',
      hearts: node.favourites ? Math.min(Math.round(node.favourites / 10), 9999) : 80,
      gender: node.gender || 'Unknown',
      age: node.age || 'Unknown',
      birthday: node.dateOfBirth ? `${node.dateOfBirth.month || 1}/${node.dateOfBirth.day || 1}` : undefined,
      bloodType: node.bloodType || 'A',
      bio: cleanDescription(node.description),
      voiceActor: voiceActorNode
        ? {
            name: voiceActorNode.name?.full || voiceActorNode.name?.userPreferred || 'Voice Actor',
            nativeName: voiceActorNode.name?.native,
            image: voiceActorNode.image?.large || voiceActorNode.image?.medium,
            language: voiceActorNode.languageV2 || 'Japanese',
          }
        : undefined,
    };
  });

  // Relations
  const relations = (media.relations?.edges || []).map((edge: any) => ({
    id: String(edge.node.id),
    title: edge.node.title?.english || edge.node.title?.romaji || 'Related Work',
    relationType: edge.relationType?.replace(/_/g, ' ') || 'Related',
    format: edge.node.format || 'TV',
    image: edge.node.coverImage?.large || edge.node.coverImage?.medium || '',
    score: edge.node.averageScore ? edge.node.averageScore / 10 : 8.0,
  }));

  // Recommendations
  const recommendations = (media.recommendations?.nodes || [])
    .filter((rec: any) => rec.mediaRecommendation)
    .map((rec: any) => ({
      id: String(rec.mediaRecommendation.id),
      title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji || 'Recommendation',
      image: rec.mediaRecommendation.coverImage?.large || rec.mediaRecommendation.coverImage?.medium || '',
      score: rec.mediaRecommendation.averageScore ? rec.mediaRecommendation.averageScore / 10 : 8.0,
      userVotes: rec.rating || 10,
    }));

  const studios = (media.studios?.nodes || []).map((s: any) => s.name);
  const producers = media.staff?.nodes?.map((st: any) => st.name?.full || st.name?.userPreferred) || [];

  const rawScore = media.averageScore || media.meanScore || 80;
  const ratingOutOf10 = Number((rawScore / 10).toFixed(1));

  const releaseYear = media.startDate?.year || media.seasonYear || new Date().getFullYear();
  let formatVal: 'TV' | 'Movie' | 'ONA' | 'OVA' | 'Special' | 'Manga' | 'Novel' | 'Light Novel' = 'TV';
  if (category === 'novel' || media.format === 'NOVEL') formatVal = 'Novel';
  else if (category === 'manga' || media.format === 'MANGA' || media.format === 'ONE_SHOT') formatVal = 'Manga';
  else if (media.format === 'MOVIE') formatVal = 'Movie';
  else if (media.format === 'ONA') formatVal = 'ONA';
  else if (media.format === 'OVA') formatVal = 'OVA';
  else if (media.format === 'SPECIAL') formatVal = 'Special';

  let statusVal: 'Releasing' | 'Finished' | 'Upcoming' | 'Not Yet Released' = 'Finished';
  if (media.status === 'RELEASING') statusVal = 'Releasing';
  else if (media.status === 'NOT_YET_RELEASED') statusVal = 'Upcoming';
  else if (media.status === 'FINISHED') statusVal = 'Finished';

  // Extract upcoming countdown / next air time if available
  let nextAiringEpisode: number | undefined;
  let nextAiringTimeStr: string | undefined;
  if (media.nextAiringEpisode) {
    nextAiringEpisode = media.nextAiringEpisode.episode;
    const airDate = new Date(media.nextAiringEpisode.airingAt * 1000);
    nextAiringTimeStr = airDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  let seasonVal: 'Winter' | 'Spring' | 'Summer' | 'Fall' | undefined;
  if (media.season === 'WINTER') seasonVal = 'Winter';
  else if (media.season === 'SPRING') seasonVal = 'Spring';
  else if (media.season === 'SUMMER') seasonVal = 'Summer';
  else if (media.season === 'FALL') seasonVal = 'Fall';

  return {
    id: String(media.id),
    title: titleEnglish,
    romajiTitle: titleRomaji,
    nativeTitle: titleNative,
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
    bannerImage: media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large,
    category,
    format: formatVal,
    status: statusVal,
    score: ratingOutOf10,
    year: releaseYear,
    season: seasonVal,
    seasonYear: media.seasonYear || releaseYear,
    genres: media.genres || ['Action', 'Fantasy'],
    description: cleanDescription(media.description),
    studio: studios[0] || 'Studio Pierrot',
    author: category === 'manga' || category === 'novel' ? (producers[0] || 'Author') : undefined,
    totalEpisodes: media.episodes,
    latestEpisode: nextAiringEpisode ? (nextAiringEpisode > 1 ? nextAiringEpisode - 1 : 1) : (media.episodes || 1),
    currentEpisodeBadge: category === 'manga'
      ? (media.chapters ? `CH ${media.chapters}` : undefined)
      : `EP ${nextAiringEpisode ? (nextAiringEpisode > 1 ? nextAiringEpisode - 1 : 1) : (media.episodes || 1)}`,
    nextEpisodeCountdown: media.nextAiringEpisode?.timeUntilAiring ? `${Math.ceil(media.nextAiringEpisode.timeUntilAiring / 86400)}d` : undefined,
    communityHearts: media.favourites ? Math.min(Math.round(media.favourites / 15), 9999) : 480,
    characters,
    relations,
    recommendations,
  };
}

const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  type
  status
  episodes
  chapters
  volumes
  duration
  genres
  tags {
    name
  }
  averageScore
  meanScore
  popularity
  favourites
  trending
  startDate {
    year
    month
    day
  }
  season
  seasonYear
  description(asHtml: false)
  nextAiringEpisode {
    episode
    airingAt
    timeUntilAiring
  }
  studios(isMain: true) {
    nodes {
      name
    }
  }
  characters(sort: ROLE, perPage: 8) {
    edges {
      role
      node {
        id
        name {
          full
          native
          userPreferred
        }
        image {
          large
          medium
        }
        gender
        age
        bloodType
        dateOfBirth {
          year
          month
          day
        }
        favourites
        description
      }
      voiceActors(language: JAPANESE, sort: FAVOURITES_DESC) {
        id
        name {
          full
          native
          userPreferred
        }
        image {
          large
          medium
        }
        languageV2
      }
    }
  }
  relations {
    edges {
      relationType
      node {
        id
        title {
          romaji
          english
        }
        format
        coverImage {
          large
          medium
        }
        averageScore
      }
    }
  }
  recommendations(sort: RATING_DESC, perPage: 6) {
    nodes {
      rating
      mediaRecommendation {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
          medium
        }
        averageScore
      }
    }
  }
`;

// Helper to calculate human readable time ago for recently aired episodes
export function formatTimeAgo(unixSeconds: number): string {
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// -------------------------------------------------------------
// 1. ANIME API CALLS
// -------------------------------------------------------------

// Hero Carousel - Trending Anime
export async function fetchTrendingAnime(perPage = 15): Promise<MediaItem[]> {
  const query = `
    query GetTrendingAnime($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 15) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'anime'));
  return deduplicateMediaItems(items);
}

// Section 1: Popular This Season (Expanded Real Items)
export async function fetchPopularThisSeason(perPage = 30): Promise<MediaItem[]> {
  const now = new Date();
  const month = now.getMonth() + 1;
  let season = 'WINTER';
  if (month >= 3 && month <= 5) season = 'SPRING';
  else if (month >= 6 && month <= 8) season = 'SUMMER';
  else if (month >= 9 && month <= 11) season = 'FALL';

  const year = now.getFullYear();

  const query = `
    query GetSeasonalAnime($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { season, seasonYear: year, perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'anime'));
  return deduplicateMediaItems(items);
}

// Section 2: Recently Released Episodes (AniList Airing Schedule with TIME_DESC -> Newest Released First, Older Released Pushed Back)
export async function fetchRecentlyReleasedEpisodes(perPage = 50): Promise<MediaItem[]> {
  const nowUnix = Math.floor(Date.now() / 1000);
  const twoWeeksAgoUnix = nowUnix - 14 * 86400; // Past 14 days of releases

  const query = `
    query GetRecentlyReleasedEpisodes($airingAt_greater: Int, $airingAt_lesser: Int, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME_DESC) {
          id
          airingAt
          episode
          timeUntilAiring
          media {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  `;

  try {
    const data = await fetchFromAniList<any>(query, {
      airingAt_greater: twoWeeksAgoUnix,
      airingAt_lesser: nowUnix,
      perPage: Math.max(perPage, 50),
    });

    const schedules = data?.Page?.airingSchedules || [];
    if (schedules.length > 0) {
      const items: MediaItem[] = [];
      const seenMediaIds = new Set<string>();

      for (const s of schedules) {
        if (!s.media) continue;
        const mediaIdStr = String(s.media.id);
        if (seenMediaIds.has(mediaIdStr)) continue;
        seenMediaIds.add(mediaIdStr);

        const mediaItem = mapAniListToMediaItem(s.media, 'anime');
        mediaItem.latestEpisode = s.episode;
        mediaItem.currentEpisodeBadge = `EP ${s.episode}`;
        mediaItem.airingAt = s.airingAt;
        mediaItem.isReleased = true;
        mediaItem.releasedTimeAgo = formatTimeAgo(s.airingAt);

        items.push(mediaItem);
      }

      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch recently released schedules from AniList:', err);
  }

  // Direct Releasing Anime Fallback
  return fetchNewEpisodesFallback(perPage);
}

// Fallback for Releasing Anime
async function fetchNewEpisodesFallback(perPage = 40): Promise<MediaItem[]> {
  const query = `
    query GetNewEpisodesFallback($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, status: RELEASING, sort: [UPDATED_AT_DESC, TRENDING_DESC], isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 40) });
  const rawList = data?.Page?.media || [];
  
  const items = rawList
    .map((m: any) => mapAniListToMediaItem(m, 'anime'))
    .filter((item: MediaItem) => item.status === 'Releasing' && item.category === 'anime');

  return deduplicateMediaItems(items);
}

// Section 2: New Episodes (Strict Exception Rule: ONLY actively airing titles with recent broadcasts)
export async function fetchNewEpisodes(perPage = 40): Promise<MediaItem[]> {
  return fetchRecentlyReleasedEpisodes(perPage);
}

// Section 3: Community Loved (Highest Favourites / Top Rated)
export async function fetchCommunityLovedAnime(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetCommunityLovedAnime($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: FAVOURITES_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'anime'));
  return deduplicateMediaItems(items);
}

// Section 4: Recently Completed
export async function fetchRecentlyCompletedAnime(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetRecentlyCompletedAnime($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, status: FINISHED, sort: [END_DATE_DESC, POPULARITY_DESC], isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const rawList = data?.Page?.media || [];
  const items = rawList
    .map((m: any) => mapAniListToMediaItem(m, 'anime'))
    .filter((item: MediaItem) => item.status === 'Finished' && item.category === 'anime');
  return deduplicateMediaItems(items);
}

// Section 5: Anime Movies
export async function fetchAnimeMovies(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetAnimeMovies($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'anime'));
  return deduplicateMediaItems(items);
}

// Section 6: Upcoming Anime
export async function fetchUpcomingAnime(perPage = 60, format?: string): Promise<MediaItem[]> {
  let formatArg = '';
  if (format && format !== 'All') {
    if (format === 'TV') formatArg = ', format_in: [TV, TV_SHORT]';
    else if (format === 'Movie') formatArg = ', format: MOVIE';
    else if (format === 'Special') formatArg = ', format_in: [SPECIAL, OVA, ONA]';
    else if (format === 'OVA' || format === 'ONA') formatArg = ', format_in: [OVA, ONA]';
  }

  const query = `
    query GetUpcomingAnime($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, status: NOT_YET_RELEASED${formatArg}, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 60) });
    const rawList = data?.Page?.media || [];
    let items = rawList.map((m: any) => mapAniListToMediaItem(m, 'anime'));

    // Client-side strict filter guarantee
    if (format && format !== 'All') {
      items = items.filter((item: MediaItem) => {
        const fmt = String(item.format || '').toUpperCase();
        if (format === 'TV') return fmt === 'TV' || fmt === 'TV_SHORT';
        if (format === 'Movie') return fmt === 'MOVIE';
        if (format === 'Special') return ['SPECIAL', 'OVA', 'ONA', 'MUSIC'].includes(fmt);
        if (format === 'OVA' || format === 'ONA') return fmt === 'OVA' || fmt === 'ONA';
        return true;
      });
    }

    return deduplicateMediaItems(items);
  } catch (err) {
    console.warn('Failed to fetch upcoming anime from AniList:', err);
    return [];
  }
}

// -------------------------------------------------------------
// 2. MANGA API CALLS (AniList & MangaDex)
// -------------------------------------------------------------

// Hero Carousel - Trending Manga
export async function fetchTrendingManga(perPage = 15): Promise<MediaItem[]> {
  const query = `
    query GetTrendingManga($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: MANGA, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 15) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'manga'));
  return deduplicateMediaItems(items);
}

// Manga Section 2: Popular Manga (Expanded)
export async function fetchPopularManga(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetPopularManga($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: MANGA, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'manga'));
  return deduplicateMediaItems(items);
}

// Manga Section 3: Recently Updated Manga (Strict Exception Rule: ONLY authentic actively releasing scanlation updates)
export async function fetchRecentlyUpdatedManga(perPage = 40): Promise<MediaItem[]> {
  const query = `
    query GetRecentlyUpdatedManga($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format_in: [MANGA, ONE_SHOT], status: RELEASING, sort: [UPDATED_AT_DESC, POPULARITY_DESC], isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 40) });
  const rawList = data?.Page?.media || [];
  const items = rawList
    .map((m: any) => mapAniListToMediaItem(m, 'manga'))
    .filter((item: MediaItem) => item.status === 'Releasing' && item.category === 'manga');
  return deduplicateMediaItems(items);
}

// Manga Section 4: Community Loved Manga
export async function fetchCommunityLovedManga(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetCommunityLovedManga($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: MANGA, sort: FAVOURITES_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'manga'));
  return deduplicateMediaItems(items);
}

// Manga Section 5: Recently Completed Manga
export async function fetchRecentlyCompletedManga(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetRecentlyCompletedManga($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: MANGA, status: FINISHED, sort: [END_DATE_DESC, POPULARITY_DESC], isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const rawList = data?.Page?.media || [];
  const items = rawList
    .map((m: any) => mapAniListToMediaItem(m, 'manga'))
    .filter((item: MediaItem) => item.status === 'Finished' && item.category === 'manga');
  return deduplicateMediaItems(items);
}

// -------------------------------------------------------------
// 3. LIGHT NOVEL API CALLS (AniList Format: NOVEL)
// -------------------------------------------------------------

// Hero Carousel - Trending Novels
export async function fetchTrendingNovels(perPage = 15): Promise<MediaItem[]> {
  const query = `
    query GetTrendingNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 15) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'novel'));
  return deduplicateMediaItems(items);
}

// Novel Section 1: Seasonal / Trending Light Novels
export async function fetchSeasonalNovels(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetSeasonalNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'novel'));
  return deduplicateMediaItems(items);
}

// Novel Section 2: Popular Light Novels (Strict Rule: Real released novel chapters/volumes)
export async function fetchPopularNovels(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetPopularNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const rawList = data?.Page?.media || [];
  const items = rawList
    .map((m: any) => mapAniListToMediaItem(m, 'novel'))
    .filter((item: MediaItem) => item.category === 'novel');
  return deduplicateMediaItems(items);
}

// Novel Section 3: Monster / Isekai / Action Novels
export async function fetchMonsterNovels(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetMonsterNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, genre: "Fantasy", sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'novel'));
  return deduplicateMediaItems(items);
}

// Novel Section 4: Princess / Romance / Villainess Novels
export async function fetchPrincessNovels(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetPrincessNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, genre: "Romance", sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'novel'));
  return deduplicateMediaItems(items);
}

// Novel Section 5: Magic / Supernatural Novels
export async function fetchMagicNovels(perPage = 30): Promise<MediaItem[]> {
  const query = `
    query GetMagicNovels($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: MANGA, format: NOVEL, genre_in: ["Magic", "Supernatural", "Adventure"], sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await fetchFromAniList<any>(query, { perPage: Math.max(perPage, 30) });
  const items = (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, 'novel'));
  return deduplicateMediaItems(items);
}

// -------------------------------------------------------------
// 4. AIRING SCHEDULE API (AniList AiringSchedule Query)
// -------------------------------------------------------------

export async function fetchAiringScheduleWeek(): Promise<ScheduleDay[]> {
  const now = new Date();
  // Find Monday of the current week (start from 00:00:00 local time)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);

  const startTimestamp = Math.floor(monday.getTime() / 1000);
  const endTimestamp = startTimestamp + 7 * 86400; // 7 full days

  const query = `
    query GetWeeklySchedule($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
          id
          airingAt
          episode
          timeUntilAiring
          media {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  `;

  try {
    // Fetch multiple pages in parallel to cover the entire week (up to 200 airings)
    const pageRequests = [1, 2, 3, 4].map((page) =>
      fetchFromAniList<any>(query, {
        page,
        airingAt_greater: startTimestamp,
        airingAt_lesser: endTimestamp,
      }).catch(() => null)
    );

    const pageResults = await Promise.all(pageRequests);
    const rawSchedules: any[] = [];
    const seenScheduleIds = new Set<number>();

    for (const res of pageResults) {
      if (res?.Page?.airingSchedules) {
        for (const s of res.Page.airingSchedules) {
          if (s && s.id && !seenScheduleIds.has(s.id)) {
            seenScheduleIds.add(s.id);
            rawSchedules.push(s);
          }
        }
      }
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayNamesShort: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];

    const weekDays: ScheduleDay[] = dayNames.map((dayName, idx) => {
      const dayDate = new Date(monday.getTime() + idx * 86400 * 1000);
      const isToday =
        dayDate.getDate() === now.getDate() &&
        dayDate.getMonth() === now.getMonth() &&
        dayDate.getFullYear() === now.getFullYear();

      const dateString = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayNameShort = dayNamesShort[idx];
      const dateNum = dayDate.getDate();
      const dayStartUnix = Math.floor(dayDate.getTime() / 1000);
      const dayEndUnix = dayStartUnix + 86400;

      // Filter and sort schedules for this day
      const dayItems = rawSchedules
        .filter((s: any) => s.airingAt >= dayStartUnix && s.airingAt < dayEndUnix && s.media)
        .sort((a: any, b: any) => a.airingAt - b.airingAt)
        .map((s: any) => {
          const mediaItem = mapAniListToMediaItem(s.media, 'anime');
          const airDate = new Date(s.airingAt * 1000);
          const timeFormatted = airDate.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          const isPast = s.airingAt <= Math.floor(Date.now() / 1000);
          const timeAgoStr = isPast ? formatTimeAgo(s.airingAt) : undefined;

          mediaItem.latestEpisode = s.episode;
          mediaItem.currentEpisodeBadge = `EP ${s.episode}`;
          mediaItem.airingAt = s.airingAt;
          mediaItem.isReleased = isPast;
          mediaItem.releasedTimeAgo = timeAgoStr;

          return {
            id: `sched_${s.id}`,
            media: mediaItem,
            airingTime: timeFormatted,
            airingAt: s.airingAt,
            episodeNumber: s.episode,
            isAiringToday: isToday,
            isReleased: isPast,
            releasedTimeAgo: timeAgoStr,
          };
        });

      return {
        day: dayName,
        dayName: dayNameShort,
        date: dateString,
        dateNumber: dateNum,
        isToday,
        items: dayItems,
      };
    });

    return weekDays;
  } catch (err) {
    console.warn('Error fetching weekly schedule from AniList:', err);
    return [];
  }
}

// -------------------------------------------------------------
// 5. LIVE SEARCH & FILTER API (AniList & MangaDex)
// -------------------------------------------------------------

export async function searchAniList(
  searchQuery: string,
  filters: Partial<FilterOptions> = {},
  page = 1,
  perPage = 24
): Promise<{ items: MediaItem[]; hasNextPage: boolean; total: number }> {
  let type: 'ANIME' | 'MANGA' = 'ANIME';
  let format_in: string[] | undefined = undefined;

  if (filters.category === 'manga') {
    type = 'MANGA';
    if (filters.format && filters.format.length > 0) {
      const mapped = filters.format.map((f) => {
        if (f.toLowerCase() === 'manga') return 'MANGA';
        if (f.toLowerCase().includes('one')) return 'ONE_SHOT';
        return f.toUpperCase().replace(/\s+/g, '_');
      });
      format_in = mapped.filter((f) => ['MANGA', 'ONE_SHOT'].includes(f));
      if (format_in.length === 0) format_in = ['MANGA', 'ONE_SHOT'];
    } else {
      format_in = ['MANGA', 'ONE_SHOT'];
    }
  } else if (filters.category === 'novel') {
    type = 'MANGA';
    format_in = ['NOVEL'];
  } else {
    type = 'ANIME';
    if (filters.format && filters.format.length > 0) {
      const mapped = filters.format.flatMap((f) => {
        const upper = f.toUpperCase().replace(/\s+/g, '_');
        if (upper === 'TV') return ['TV', 'TV_SHORT'];
        if (upper === 'MOVIE') return ['MOVIE'];
        if (upper === 'SPECIAL') return ['SPECIAL'];
        if (upper === 'OVA') return ['OVA'];
        if (upper === 'ONA') return ['ONA'];
        return [upper];
      });
      format_in = mapped;
    }
  }

  let status_in: string[] | undefined = undefined;
  if (filters.status && filters.status.length > 0) {
    status_in = filters.status.map((st) => {
      if (st.toLowerCase().includes('releasing')) return 'RELEASING';
      if (st.toLowerCase().includes('finished')) return 'FINISHED';
      if (st.toLowerCase().includes('upcoming') || st.toLowerCase().includes('not yet')) return 'NOT_YET_RELEASED';
      if (st.toLowerCase().includes('cancel')) return 'CANCELLED';
      if (st.toLowerCase().includes('hiatus')) return 'HIATUS';
      return 'RELEASING';
    });
  }

  let genre_in: string[] | undefined = undefined;
  if (filters.genres && filters.genres.length > 0) {
    genre_in = filters.genres;
  }

  let tag_in: string[] | undefined = undefined;
  if (filters.advancedTags && filters.advancedTags.length > 0) {
    tag_in = filters.advancedTags;
  }

  let averageScore_greater: number | undefined = undefined;
  if (filters.minScore && filters.minScore !== 'Any') {
    const parsed = parseInt(filters.minScore, 10);
    if (!isNaN(parsed)) {
      averageScore_greater = parsed * 10;
    }
  }
  if (filters.scoreRange && filters.scoreRange[0] > 0) {
    averageScore_greater = Math.max(averageScore_greater || 0, filters.scoreRange[0]);
  }

  let seasonYear: number | undefined = undefined;
  let startDate_greater: number | undefined = undefined;
  let startDate_lesser: number | undefined = undefined;

  if (filters.selectedYear && filters.selectedYear !== 'Any') {
    const yr = parseInt(filters.selectedYear, 10);
    if (!isNaN(yr)) {
      seasonYear = yr;
    }
  } else if (filters.yearRange && (filters.yearRange[0] > 1940 || filters.yearRange[1] < 2028)) {
    startDate_greater = filters.yearRange[0] * 10000;
    startDate_lesser = filters.yearRange[1] * 10000 + 1231;
  }

  let season: string | undefined = undefined;
  if (filters.season && filters.season.length > 0) {
    const validSeasons = filters.season.filter((s) => s !== 'Any');
    if (validSeasons.length > 0) {
      season = validSeasons[0].toUpperCase();
    }
  }

  const variables: Record<string, any> = {
    page,
    perPage,
    type,
    isAdult: false,
    sort: searchQuery.trim() ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : ['POPULARITY_DESC'],
  };

  if (searchQuery.trim()) variables.search = searchQuery.trim();
  if (format_in && format_in.length > 0) variables.format_in = format_in;
  if (status_in && status_in.length > 0) variables.status_in = status_in;
  if (genre_in && genre_in.length > 0) variables.genre_in = genre_in;
  if (tag_in && tag_in.length > 0) variables.tag_in = tag_in;
  if (averageScore_greater !== undefined) variables.averageScore_greater = averageScore_greater;
  if (seasonYear !== undefined) variables.seasonYear = seasonYear;
  if (startDate_greater !== undefined) variables.startDate_greater = startDate_greater;
  if (startDate_lesser !== undefined) variables.startDate_lesser = startDate_lesser;
  if (season !== undefined) variables.season = season;

  const query = `
    query SearchMedia(
      $page: Int,
      $perPage: Int,
      $search: String,
      $type: MediaType,
      $format_in: [MediaFormat],
      $status_in: [MediaStatus],
      $genre_in: [String],
      $tag_in: [String],
      $season: MediaSeason,
      $seasonYear: Int,
      $startDate_greater: FuzzyDateInt,
      $startDate_lesser: FuzzyDateInt,
      $averageScore_greater: Int,
      $sort: [MediaSort],
      $isAdult: Boolean
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          hasNextPage
        }
        media(
          search: $search,
          type: $type,
          format_in: $format_in,
          status_in: $status_in,
          genre_in: $genre_in,
          tag_in: $tag_in,
          season: $season,
          seasonYear: $seasonYear,
          startDate_greater: $startDate_greater,
          startDate_lesser: $startDate_lesser,
          averageScore_greater: $averageScore_greater,
          sort: $sort,
          isAdult: $isAdult
        ) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const data = await fetchFromAniList<any>(query, variables);
    const mediaList = data?.Page?.media || [];
    const pageInfo = data?.Page?.pageInfo || { total: mediaList.length, hasNextPage: false };

    let items = mediaList.map((m: any) => mapAniListToMediaItem(m, filters.category));

    // Refine studio filter client-side if provided
    if (filters.studio && filters.studio.trim()) {
      const studioQuery = filters.studio.trim().toLowerCase();
      items = items.filter((item) =>
        item.studio?.toLowerCase().includes(studioQuery)
      );
    }

    const uniqueItems = deduplicateMediaItems(items);

    return {
      items: uniqueItems,
      hasNextPage: pageInfo.hasNextPage || false,
      total: pageInfo.total || uniqueItems.length,
    };
  } catch (err) {
    console.warn('Search error from AniList:', err);
    return { items: [], hasNextPage: false, total: 0 };
  }
}

// -------------------------------------------------------------
// 6. SINGLE MEDIA DETAILS BY ID
// -------------------------------------------------------------

export async function fetchMediaDetailsById(id: string | number): Promise<MediaItem | null> {
  const query = `
    query GetMediaById($id: Int) {
      Media(id: $id, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  try {
    const data = await fetchFromAniList<any>(query, { id: Number(id) });
    if (!data?.Media) return null;
    return mapAniListToMediaItem(data.Media);
  } catch (err) {
    console.warn(`Error fetching media by id ${id}:`, err);
    return null;
  }
}

// -------------------------------------------------------------
// 7. GENERAL ANILIST MEDIA QUERY WITH FLEXIBLE FILTERS & SORT
// -------------------------------------------------------------

export async function fetchAniListMedia(
  type: 'ANIME' | 'MANGA' = 'ANIME',
  genre?: string,
  sort: string[] | string = ['TRENDING_DESC', 'POPULARITY_DESC'],
  perPage = 20,
  season?: string,
  seasonYear?: number,
  format?: string
): Promise<MediaItem[]> {
  const sortArg = Array.isArray(sort) ? `[${sort.join(', ')}]` : sort;
  const genreArg = genre ? `, genre: "${genre}"` : '';
  const formatArg = format ? `, format: ${format}` : '';
  const seasonArg = season ? `, season: ${season}` : '';
  const seasonYearArg = seasonYear ? `, seasonYear: ${seasonYear}` : '';

  const query = `
    query GetAniListMedia($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ${type}${formatArg}${genreArg}${seasonArg}${seasonYearArg}, sort: ${sortArg}, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  try {
    const data = await fetchFromAniList<any>(query, { perPage });
    const categoryOverride: MediaCategory = type === 'ANIME' ? 'anime' : format === 'NOVEL' ? 'novel' : 'manga';
    return (data?.Page?.media || []).map((m: any) => mapAniListToMediaItem(m, categoryOverride));
  } catch (err) {
    console.warn('fetchAniListMedia failed:', err);
    return [];
  }
}

// -------------------------------------------------------------
// 8. MANGADEX REST API (Manga Reader Chapter Page Image Arrays)
// -------------------------------------------------------------

export interface MangaDexChapter {
  id: string;
  chapter: string;
  title: string;
  volume?: string;
  pages: number;
  publishAt: string;
}

export async function fetchMangaDex<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      if (Array.isArray(val)) {
        val.forEach((item) => queryParams.append(`${key}[]`, item));
      } else {
        queryParams.append(key, String(val));
      }
    }
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cacheKey = `mangadex_${cleanEndpoint}_${queryString}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Try server proxy first
  try {
    const proxyUrl = `/api/mangadex/${cleanEndpoint}${queryString}`;
    const proxyRes = await fetch(proxyUrl, {
      headers: { Accept: 'application/json' },
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.result !== 'error') {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      }
    }
  } catch {
    // Fall back to direct
  }

  // 2. Direct request fallback
  try {
    const directUrl = `${MANGADEX_URL}/${cleanEndpoint}${queryString}`;
    const directRes = await fetch(directUrl, {
      headers: { Accept: 'application/json' },
    });
    if (directRes.ok) {
      const data = await directRes.json();
      if (data && data.result !== 'error') {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data as T;
      }
    }
  } catch {
    // Fail gracefully
  }

  return null;
}

/**
 * Search MangaDex by manga title
 */
export async function searchMangaDex(title: string): Promise<string | null> {
  if (!title) return null;
  const cleanTitle = title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();

  const data = await fetchMangaDex<any>('manga', {
    title: cleanTitle,
    limit: 5,
    'order[relevance]': 'desc',
    'includes': ['cover_art'],
    'contentRating': ['safe', 'suggestive', 'erotica'],
  });

  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    return data.data[0].id;
  }
  return null;
}

/**
 * Fetch English chapters list from MangaDex
 */
export async function fetchMangaDexChapters(mangaId: string): Promise<MangaDexChapter[]> {
  const data = await fetchMangaDex<any>(`manga/${mangaId}/feed`, {
    translatedLanguage: ['en'],
    'order[chapter]': 'asc',
    limit: 100,
    'contentRating': ['safe', 'suggestive', 'erotica'],
  });

  if (data?.data && Array.isArray(data.data)) {
    return data.data.map((item: any) => ({
      id: item.id,
      chapter: item.attributes?.chapter || '1',
      title: item.attributes?.title || `Chapter ${item.attributes?.chapter || ''}`,
      volume: item.attributes?.volume,
      pages: item.attributes?.pages || 0,
      publishAt: item.attributes?.publishAt || '',
    }));
  }
  return [];
}

/**
 * Fetch chapter page image URLs array from MangaDex @Home server
 */
export async function fetchMangaDexChapterPages(chapterId: string): Promise<string[]> {
  const atHomeData = await fetchMangaDex<any>(`at-home/server/${chapterId}`);
  if (!atHomeData?.baseUrl || !atHomeData?.chapter?.hash || !Array.isArray(atHomeData?.chapter?.data)) {
    return [];
  }

  const { baseUrl, chapter } = atHomeData;
  const hash = chapter.hash;
  const pageFiles: string[] = chapter.data || [];

  return pageFiles.map((filename) => `${baseUrl}/data/${hash}/${filename}`);
}

/**
 * Convenience method to get chapter page image array by title and chapter number
 */
export async function getMangaPages(title: string, chapterNumber: number): Promise<string[]> {
  const mangaId = await searchMangaDex(title);
  if (!mangaId) return [];

  const chapters = await fetchMangaDexChapters(mangaId);
  if (!chapters.length) return [];

  const targetChapter =
    chapters.find(
      (c) => parseFloat(c.chapter) === chapterNumber || parseInt(c.chapter, 10) === chapterNumber
    ) || chapters[0];

  if (!targetChapter?.id) return [];
  return await fetchMangaDexChapterPages(targetChapter.id);
}

// Re-export Anify and Logo services for a unified data layer
export * from './anifyService';
export * from './logoService';


