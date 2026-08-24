import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { searchAniList } from '../../services/api';
import { cacheGet, cacheGetSync, cacheSet, preloadMediaImages } from '../../services/cacheService';
import { MediaCategory, MediaItem, FilterOptions } from '../../types';
import { getRatingDisplay } from '../../utils/rating';
import { PosterImage } from '../common/PosterImage';

// Synchronous instant local filter matching helper
function applyLocalFilterMatching(
  items: MediaItem[],
  filterObj: FilterOptions,
  query: string
): MediaItem[] {
  const trimmedQ = query.trim().toLowerCase();
  return items.filter((item) => {
    // Search query match if provided
    if (trimmedQ) {
      const matchTitle =
        item.title?.toLowerCase().includes(trimmedQ) ||
        item.romajiTitle?.toLowerCase().includes(trimmedQ) ||
        item.nativeTitle?.toLowerCase().includes(trimmedQ) ||
        item.genres?.some((g) => g.toLowerCase().includes(trimmedQ)) ||
        item.author?.toLowerCase().includes(trimmedQ) ||
        item.studio?.toLowerCase().includes(trimmedQ);
      if (!matchTitle) return false;
    }

    // Category
    if (filterObj.category) {
      if (filterObj.category === 'anime' && item.category !== 'anime') return false;
      if (filterObj.category === 'manga' && item.category !== 'manga') return false;
      if (filterObj.category === 'novel' && item.category !== 'novel') return false;
    }

    // Genres
    if (filterObj.genres && filterObj.genres.length > 0) {
      const hasGenres = filterObj.genres.every((g) =>
        item.genres?.some((ig) => ig.toLowerCase() === g.toLowerCase())
      );
      if (!hasGenres) return false;
    }

    // Advanced Tags
    if (filterObj.advancedTags && filterObj.advancedTags.length > 0) {
      const hasTags = filterObj.advancedTags.every(
        (t) =>
          item.genres?.some((ig) => ig.toLowerCase() === t.toLowerCase()) ||
          item.description?.toLowerCase().includes(t.toLowerCase())
      );
      if (!hasTags) return false;
    }

    // Format
    if (filterObj.format && filterObj.format.length > 0) {
      const itemFmt = (item.format || '').toUpperCase().replace(/\s+/g, '_');
      const hasFormat = filterObj.format.some((f) => {
        const target = f.toUpperCase().replace(/\s+/g, '_');
        if (target === 'TV') return itemFmt === 'TV' || itemFmt === 'TV_SHORT';
        if (target === 'MANGA') return itemFmt === 'MANGA' || itemFmt === 'ONE_SHOT';
        if (target === 'NOVEL') return itemFmt === 'NOVEL' || itemFmt === 'LIGHT_NOVEL';
        return itemFmt === target;
      });
      if (!hasFormat) return false;
    }

    // Status
    if (filterObj.status && filterObj.status.length > 0) {
      const itemSt = (item.status || '').toLowerCase();
      const hasStatus = filterObj.status.some((s) => {
        const sLow = s.toLowerCase();
        if (sLow.includes('releas')) return itemSt.includes('releas') || itemSt.includes('ongoing');
        if (sLow.includes('finish')) return itemSt.includes('finish') || itemSt.includes('complet');
        if (sLow.includes('upcom') || sLow.includes('not yet'))
          return itemSt.includes('upcom') || itemSt.includes('not yet');
        return itemSt.includes(sLow);
      });
      if (!hasStatus) return false;
    }

    // Min Score ('6+', '7+', '8+', '9+')
    if (filterObj.minScore && filterObj.minScore !== 'Any') {
      const min = parseFloat(filterObj.minScore);
      if (!isNaN(min) && (item.score || 0) < min) {
        return false;
      }
    }

    // Score Range
    if (filterObj.scoreRange && filterObj.scoreRange[0] > 0) {
      const minScoreVal = filterObj.scoreRange[0] / 10;
      if ((item.score || 0) < minScoreVal) return false;
    }

    // Year chip
    if (filterObj.selectedYear && filterObj.selectedYear !== 'Any') {
      const yr = parseInt(filterObj.selectedYear, 10);
      if (!isNaN(yr)) {
        const itemYr = typeof item.year === 'number' ? item.year : parseInt(String(item.year), 10);
        const itemSeasonYr = item.seasonYear;
        if (itemYr !== yr && itemSeasonYr !== yr) {
          return false;
        }
      }
    }

    // Season
    if (filterObj.season && filterObj.season.length > 0) {
      const validSeasons = filterObj.season.filter((s) => s !== 'Any');
      if (validSeasons.length > 0) {
        if (!item.season || !validSeasons.some((s) => s.toLowerCase() === item.season?.toLowerCase())) {
          return false;
        }
      }
    }

    // Studio
    if (filterObj.studio && filterObj.studio.trim()) {
      if (!item.studio?.toLowerCase().includes(filterObj.studio.trim().toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

function getCategoryFallbackRecommendations(cat: MediaCategory): MediaItem[] {
  if (cat === 'manga') {
    return (
      cacheGetSync<MediaItem[]>('home_manga_popular_30') ||
      cacheGetSync<MediaItem[]>('home_manga_popular_10') ||
      cacheGetSync<MediaItem[]>('home_manga_trending_15') ||
      cacheGetSync<MediaItem[]>('home_manga_trending_6') ||
      []
    );
  }
  if (cat === 'novel') {
    return (
      cacheGetSync<MediaItem[]>('home_novel_popular_30') ||
      cacheGetSync<MediaItem[]>('home_novel_popular_10') ||
      cacheGetSync<MediaItem[]>('home_novel_seasonal_30') ||
      cacheGetSync<MediaItem[]>('home_novel_seasonal_10') ||
      []
    );
  }
  return (
    cacheGetSync<MediaItem[]>('home_anime_popular_season_30') ||
    cacheGetSync<MediaItem[]>('home_anime_popular_season_10') ||
    cacheGetSync<MediaItem[]>('home_anime_trending_15') ||
    cacheGetSync<MediaItem[]>('home_anime_trending_6') ||
    []
  );
}

export const SearchView: React.FC = () => {
  const { filters, setFilters, setShowFilterModal, openMediaDetails, userLibrary } = useApp();
  const [searchInput, setSearchInput] = useState(filters.query || '');
  
  // Synchronous initial hydration from category cache or recommendations
  const [results, setResults] = useState<MediaItem[]>(() => {
    return getCategoryFallbackRecommendations(filters.category);
  });
  
  const [loading, setLoading] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryCacheRef = useRef<Map<string, MediaItem[]>>(new Map());
  const allDiscoveredItemsRef = useRef<MediaItem[]>([]);

  const mergeDiscoveredItems = useCallback((newItems: MediaItem[]) => {
    if (!newItems || newItems.length === 0) return;
    preloadMediaImages(newItems);
    const existingIds = new Set(allDiscoveredItemsRef.current.map((i) => String(i.id)));
    const toAdd = newItems.filter((i) => !existingIds.has(String(i.id)));
    if (toAdd.length > 0) {
      allDiscoveredItemsRef.current = [...allDiscoveredItemsRef.current, ...toAdd];
    }
  }, []);

  // Helper to generate consistent cache key
  const getCacheKey = useCallback(
    (cat: MediaCategory, query: string, filterObj: typeof filters) => {
      return `${cat}_${query.trim().toLowerCase()}_${JSON.stringify({
        g: filterObj.genres,
        f: filterObj.format,
        s: filterObj.status,
        lib: filterObj.libraryState,
        ms: filterObj.minScore,
        sr: filterObj.scoreRange,
        sy: filterObj.selectedYear,
        yr: filterObj.yearRange,
        se: filterObj.season,
        st: filterObj.studio,
        at: filterObj.advancedTags,
      })}`;
    },
    []
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pre-load default initial search items for Anime, Manga, and Novel on mount for instant zero-latency switching
  useEffect(() => {
    const prefetchCategories = async () => {
      const categories: MediaCategory[] = ['anime', 'manga', 'novel'];
      for (const cat of categories) {
        const key = getCacheKey(cat, '', filters);
        if (!categoryCacheRef.current.has(key)) {
          searchAniList('', { ...filters, category: cat }, 1, 30)
            .then((res) => {
              if (res?.items && res.items.length > 0) {
                mergeDiscoveredItems(res.items);
                categoryCacheRef.current.set(key, res.items);
                // If it matches currently selected category and results are still empty or showing fallback, set results
                if (cat === filters.category && (!results || results.length === 0 || !searchInput)) {
                  setResults(res.items);
                }
              }
            })
            .catch(() => {});
        }
      }
    };
    prefetchCategories();
  }, []);

  // Perform search when filters or searchInput changes
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const currentKey = getCacheKey(filters.category, searchInput, filters);
    const cachedItems = categoryCacheRef.current.get(currentKey) || cacheGetSync<MediaItem[]>(`search_${currentKey}`);

    // 1. If exact cached results exist, display them instantly with ZERO latency
    if (cachedItems && cachedItems.length > 0) {
      setResults(cachedItems);
      setLoading(false);
    } else {
      // 2. Instant local filter matching from all discovered items so content updates instantly with 0ms delay
      const instantLocalMatches = applyLocalFilterMatching(
        allDiscoveredItemsRef.current,
        filters,
        searchInput
      );
      if (instantLocalMatches.length > 0) {
        setResults(instantLocalMatches);
        setLoading(false);
      } else if (!searchInput.trim()) {
        const fallbacks = getCategoryFallbackRecommendations(filters.category);
        if (fallbacks.length > 0) {
          setResults(fallbacks);
        }
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    // Debounce for text query changes; instant execution for category / filter shifts
    const delay = searchInput !== (filters.query || '') ? 250 : 0;

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchAniList(searchInput, filters, 1, 30);
        if (response?.items && response.items.length > 0) {
          mergeDiscoveredItems(response.items);
          categoryCacheRef.current.set(currentKey, response.items);
          cacheSet(`search_${currentKey}`, response.items);
          setResults(response.items);
        } else if (!searchInput.trim()) {
          const fallbacks = getCategoryFallbackRecommendations(filters.category);
          if (fallbacks.length > 0) {
            setResults(fallbacks);
          }
        }
      } catch (err) {
        console.error('Error during search:', err);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    searchInput,
    filters.category,
    filters.genres,
    filters.format,
    filters.status,
    filters.libraryState,
    filters.minScore,
    filters.scoreRange,
    filters.selectedYear,
    filters.yearRange,
    filters.season,
    filters.studio,
    filters.advancedTags,
    getCacheKey,
    mergeDiscoveredItems,
  ]);

  const handleCategorySelect = (cat: MediaCategory) => {
    if (cat === filters.category) {
      setCategoryDropdownOpen(false);
      return;
    }

    // Immediately swap results from cache or fallbacks if present for instant zero-latency transition
    const targetKey = getCacheKey(cat, searchInput, { ...filters, category: cat });
    const cached = categoryCacheRef.current.get(targetKey) || cacheGetSync<MediaItem[]>(`search_${targetKey}`);
    if (cached && cached.length > 0) {
      setResults(cached);
      setLoading(false);
    } else {
      const instantMatches = applyLocalFilterMatching(
        allDiscoveredItemsRef.current,
        { ...filters, category: cat },
        searchInput
      );
      if (instantMatches.length > 0) {
        setResults(instantMatches);
        setLoading(false);
      } else {
        const fallbacks = getCategoryFallbackRecommendations(cat);
        if (fallbacks.length > 0) {
          setResults(fallbacks);
        }
      }
    }

    setFilters((prev) => ({ ...prev, category: cat }));
    setCategoryDropdownOpen(false);
  };

  const getCategoryLabel = (cat: MediaCategory) => {
    switch (cat) {
      case 'anime':
        return 'Anime';
      case 'manga':
        return 'Manga';
      case 'novel':
        return 'Novel';
      default:
        return 'Anime';
    }
  };

  const activeFiltersCount =
    filters.genres.length +
    filters.format.length +
    filters.status.length +
    (filters.libraryState !== 'Any' ? 1 : 0) +
    (filters.minScore !== 'Any' ? 1 : 0) +
    (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100 ? 1 : 0) +
    (filters.selectedYear !== 'Any' ? 1 : 0) +
    (filters.yearRange[0] > 1940 || filters.yearRange[1] < 2028 ? 1 : 0) +
    filters.season.length +
    (filters.studio ? 1 : 0) +
    filters.advancedTags.length;

  const displayResults = React.useMemo(() => {
    let list = results;
    if (filters.libraryState === 'In Library') {
      list = list.filter((item) =>
        userLibrary.some((entry) => String(entry.mediaId) === String(item.id))
      );
    } else if (filters.libraryState === 'Not In Library') {
      list = list.filter(
        (item) => !userLibrary.some((entry) => String(entry.mediaId) === String(item.id))
      );
    }
    return Array.from(new Map(list.map((item) => [String(item.id), item])).values());
  }, [results, filters.libraryState, userLibrary]);

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pt-5 pb-32 select-none relative">
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6">
        {/* 1. SEARCH SCREEN TITLE & CONTENT TYPE SELECTOR */}
        <div className="flex items-center gap-2.5 mb-4 relative">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            Search
          </h1>

          {/* Anime / Manga / Novel Selection Capsule */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1 rounded-2xl bg-black/10 border border-white/10 text-3xl font-black text-white tracking-tight drop-shadow-md cursor-pointer hover:border-white/25 transition-all"
            >
              <span>{getCategoryLabel(filters.category)}</span>
              <ChevronDown className="w-5 h-5 text-white flex-shrink-0" />
            </button>

            {/* Selection Dropdown Popup */}
            {categoryDropdownOpen && (
              <div className="absolute left-0 top-full mt-2.5 z-30 min-w-[150px] bg-[#14151b] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {(['anime', 'manga', 'novel'] as MediaCategory[]).map((cat) => {
                  const isSelected = filters.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-base font-extrabold capitalize text-white hover:text-purple-300 cursor-pointer transition-colors"
                    >
                      <span>{getCategoryLabel(cat)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#c084fc] stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 2. SEARCH INPUT BAR & FILTER ICON BUTTON */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setFilters((prev) => ({ ...prev, query: e.target.value }));
              }}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-black/10 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c084fc] transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setFilters((prev) => ({ ...prev, query: '' }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Action Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            aria-label="Open Filters"
            className={`h-[48px] w-[48px] rounded-2xl border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
              activeFiltersCount > 0
                ? 'bg-[#a855f7] border-[#c084fc] text-white shadow-none'
                : 'bg-black/10 border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* 3. ANIME / MANGA / NOVEL SEARCH RESULT CARDS ROW */}
        {loading && displayResults.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-2 rounded-2xl bg-white/5 border border-white/5"
              >
                {/* Empty static dark slate container (#1e232a) skeleton overlay exclusively for the image area */}
                <div className="w-[84px] h-[115px] rounded-xl bg-[#1e232a] border border-white/5 flex-shrink-0" />
                <div className="flex-1 space-y-2 pr-2">
                  <div className="w-2/3 h-4 bg-white/10 rounded" />
                  <div className="w-1/3 h-3 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displayResults.length > 0 ? (
          <div className="space-y-3">
            {displayResults.map((item) => {
              const displayScore = getRatingDisplay(item);
              let rawFormat = (
                item.format ||
                (filters.category === 'manga'
                  ? 'MANGA'
                  : filters.category === 'novel'
                  ? 'NOVEL'
                  : 'TV')
              ).toUpperCase();

              if (
                rawFormat === 'LIGHT NOVEL' ||
                rawFormat === 'LIGHT_NOVEL' ||
                filters.category === 'novel' ||
                item.category === 'novel'
              ) {
                rawFormat = 'NOVEL';
              }

              const isMovie = rawFormat === 'MOVIE';
              const subtitle =
                item.nativeTitle ||
                item.romajiTitle ||
                item.description?.slice(0, 45) ||
                '';

              return (
                <div
                  key={item.id}
                  onClick={() => openMediaDetails(item)}
                  className="flex items-center gap-4 p-2 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors select-none group"
                >
                  {/* Poster Thumbnail Dimensions: Exactly w-[84px] h-[115px] with isolated skeleton */}
                  <PosterImage
                    src={item.coverImage}
                    alt={item.title}
                    className="w-[84px] h-[115px] rounded-xl border border-white/10 flex-shrink-0 shadow-md"
                    imgClassName="group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Details Column */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h3>

                    {subtitle && (
                      <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                        {subtitle}
                      </p>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs font-black text-purple-400 [text-shadow:0_0_8px_rgba(168,85,247,0.85)] tracking-tight">
                        {displayScore}
                      </span>
                      <span className="text-xs font-bold text-[#808080] select-none leading-none">
                        |
                      </span>
                      <span
                        className={`text-xs font-extrabold uppercase tracking-wide ${
                          isMovie ? 'text-[#E11D48]' : 'text-[#3B82F6]'
                        }`}
                      >
                        {rawFormat}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-neutral-400">
            <p className="text-sm font-medium">No results found.</p>
            <p className="text-xs text-neutral-500 mt-1">
              Try adjusting your keywords or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
