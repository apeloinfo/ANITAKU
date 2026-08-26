import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Heart,
  Share2,
  Download,
  Search,
  Compass,
  Eye,
  Info,
  Music,
  ListOrdered,
  Edit3,
  ChevronDown,
  ChevronUp,
  Play,
  Tv,
  BookOpen,
  Bookmark,
  CheckCheck,
  Trash2,
  PlusCircle,
  Check,
  Loader2,
  Calendar,
  Layers,
  List,
  Grid,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MediaItem, Character, EpisodeItem, MangaChapterItem, NovelChapterItem } from '../../types';
import { getRatingDisplay } from '../../utils/rating';
import { PosterImage } from '../common/PosterImage';
import {
  fetchMediaEpisodes,
  fetchMediaMangaChapters,
  fetchMediaNovelChapters,
  fetchMediaDetailsById,
} from '../../services/apiClient';

export const DetailsView: React.FC = () => {
  const {
    selectedMedia,
    openMediaDetails,
    closeMediaDetails,
    setShowAddToLibrary,
    setSelectedCharacter,
    setShowWatchOrder,
    setShowEpisodeSearch,
    setActiveVideoEpisode,
    setActiveReader,
    isMediaFavorite,
    toggleFavorite,
    getLibraryEntry,
    showToast,
  } = useApp();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Full detailed media item & loading state
  const [detailedMedia, setDetailedMedia] = useState<MediaItem | null>(selectedMedia);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(true);

  // Real Dynamic Episodes / Chapters from Live Providers
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [mangaChapters, setMangaChapters] = useState<MangaChapterItem[]>([]);
  const [novelChapters, setNovelChapters] = useState<NovelChapterItem[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(true);

  // Fetch full detailed metadata and real episodes/chapters dynamically
  useEffect(() => {
    let isCancelled = false;

    async function loadAllMediaContent() {
      if (!selectedMedia) return;
      setIsLoadingDetails(true);
      setIsLoadingContent(true);
      setSelectedRangeIndex(0);
      setDetailedMedia(selectedMedia);
      setEpisodes([]);
      setMangaChapters([]);
      setNovelChapters([]);

      try {
        // 1. Fetch detailed metadata from AniList GraphQL
        const fullData = await fetchMediaDetailsById(selectedMedia.id);
        if (isCancelled) return;

        const effectiveMedia = fullData || selectedMedia;
        if (fullData) {
          setDetailedMedia(fullData);
        }
        setIsLoadingDetails(false);

        // 2. Fetch real dynamic episodes / chapters using full metadata
        if (effectiveMedia.category === 'anime') {
          const liveEps = await fetchMediaEpisodes(effectiveMedia);
          if (!isCancelled) {
            setEpisodes(liveEps);
          }
        } else if (effectiveMedia.category === 'manga') {
          const liveManga = await fetchMediaMangaChapters(effectiveMedia);
          if (!isCancelled) {
            setMangaChapters(liveManga);
          }
        } else {
          const liveNovels = await fetchMediaNovelChapters(effectiveMedia);
          if (!isCancelled) {
            setNovelChapters(liveNovels);
          }
        }
      } catch (err) {
        console.warn('Failed to load media details & content:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingDetails(false);
          setIsLoadingContent(false);
        }
      }
    }

    loadAllMediaContent();

    return () => {
      isCancelled = true;
    };
  }, [selectedMedia?.id, selectedMedia?.category]);

  if (!selectedMedia) return null;

  // Active consolidated media data (prefer detailed fetched metadata over raw preview card)
  const activeMedia: MediaItem = detailedMedia || selectedMedia;

  // Library entry status check
  const libraryEntry = getLibraryEntry(activeMedia.id);

  // Favorites status check (strictly separate from library status)
  const isFavorite = isMediaFavorite(activeMedia.id);

  const isUpcoming = activeMedia.status === 'Upcoming' || activeMedia.status === 'Not Yet Released';

  // Dynamic pagination based strictly on verified loaded items
  const totalCount =
    activeMedia.category === 'anime'
      ? episodes.length
      : activeMedia.category === 'manga'
      ? mangaChapters.length
      : novelChapters.length;

  const rangeSize = 50;
  const rangeCount = Math.max(1, Math.ceil((totalCount || 1) / rangeSize));
  const ranges: string[] = [];
  if (!isLoadingContent && totalCount > 0) {
    for (let i = 0; i < rangeCount; i++) {
      const start = i * rangeSize + 1;
      const end = Math.min((i + 1) * rangeSize, totalCount);
      ranges.push(`${start}-${end}`);
    }
  }

  const currentRangeStart = selectedRangeIndex * rangeSize;
  const currentRangeEnd = currentRangeStart + rangeSize;

  const displayedEpisodes = episodes.slice(currentRangeStart, currentRangeEnd);
  const displayedMangaChapters = mangaChapters.slice(currentRangeStart, currentRangeEnd);
  const displayedNovelChapters = novelChapters.slice(currentRangeStart, currentRangeEnd);

  // Runtime Aggregated Metrics (computed dynamically when duration is known)
  const avgDuration = activeMedia.duration;
  let runtimeMetricString: string | null = null;
  if (avgDuration && totalCount > 0) {
    const totalMinutes = totalCount * avgDuration;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    runtimeMetricString =
      totalHours > 0
        ? `${avgDuration}MINS · ${totalHours}HRS ${remainingMins}MINS`
        : `${avgDuration}MINS · ${remainingMins}MINS`;
  } else if (avgDuration) {
    runtimeMetricString = `${avgDuration}MINS / EP`;
  }

  // Genre pill dynamic styling helper
  const getGenrePillStyle = (genre: string) => {
    const g = genre.toLowerCase();
    if (g.includes('action') || g.includes('martial') || g.includes('supernatural')) {
      return 'border-emerald-600/70 bg-[#0e1914] text-white';
    }
    if (g.includes('adventure') || g.includes('fantasy') || g.includes('shounen') || g.includes('sports')) {
      return 'border-amber-700/70 bg-[#19120e] text-white';
    }
    if (g.includes('comedy') || g.includes('slice') || g.includes('parody')) {
      return 'border-cyan-700/70 bg-[#0e1619] text-white';
    }
    if (g.includes('romance') || g.includes('drama') || g.includes('magic')) {
      return 'border-rose-700/70 bg-[#190e14] text-white';
    }
    if (g.includes('sci-fi') || g.includes('mecha') || g.includes('mystery') || g.includes('psychological')) {
      return 'border-purple-700/70 bg-[#150e19] text-white';
    }
    return 'border-white/20 bg-white/5 text-white';
  };

  // Rating Display: Strictly computed without placeholders
  const ratingScore =
    activeMedia.score && activeMedia.score > 0
      ? activeMedia.score > 10
        ? (activeMedia.score / 10).toFixed(1)
        : activeMedia.score.toFixed(1)
      : null;

  // Studio / Author
  const studioName = activeMedia.studio || activeMedia.author;

  // Dynamic Library Button Styling & Icon based on active saved status
  const getLibraryButtonDetails = () => {
    if (!libraryEntry) {
      return {
        label: 'Add to Library',
        icon: <PlusCircle className="w-4 h-4 text-white shrink-0" />,
        className: 'bg-[#4a4358] hover:bg-[#564e66] text-white shadow-lg border border-white/10',
      };
    }

    switch (libraryEntry.status) {
      case 'Watching':
        return {
          label: 'Watching',
          icon: <Tv className="w-4 h-4 text-emerald-400 shrink-0" />,
          className:
            'bg-[#0e1913] hover:bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.2)]',
        };
      case 'Reading':
        return {
          label: 'Reading',
          icon: <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />,
          className:
            'bg-[#0e1913] hover:bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.2)]',
        };
      case 'Planning':
        return {
          label: 'Planning',
          icon: <Bookmark className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />,
          className:
            'bg-[#18130a] hover:bg-amber-950/60 border border-amber-500/50 text-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.2)]',
        };
      case 'Completed':
        return {
          label: 'Completed',
          icon: <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />,
          className:
            'bg-[#0b1420] hover:bg-sky-950/60 border border-sky-500/50 text-sky-400 shadow-[0_4px_20px_rgba(56,189,248,0.2)]',
        };
      case 'Dropped':
        return {
          label: 'Dropped',
          icon: <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />,
          className:
            'bg-[#1a0a0e] hover:bg-rose-950/60 border border-rose-500/50 text-rose-400 shadow-[0_4px_20px_rgba(244,63,94,0.2)]',
        };
      default:
        return {
          label: libraryEntry.status,
          icon: <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />,
          className:
            'bg-[#0e1913] hover:bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.2)]',
        };
    }
  };

  // Age Rating e.g. PG-13
  const ageRating = activeMedia.ageRating;

  // Release Year
  const releaseYear = activeMedia.year || activeMedia.seasonYear;

  // Airing Status
  const airingStatus = activeMedia.status;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: activeMedia.title,
          text: `Check out ${activeMedia.title} on Satori!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  const handleEpisodeClick = (ep: EpisodeItem) => {
    setActiveVideoEpisode({ media: activeMedia, episodeNumber: ep.number });
  };

  const handleMangaClick = (ch: MangaChapterItem) => {
    setActiveReader({ media: activeMedia, chapterNumber: ch.chapterNumber, chapterId: ch.id });
  };

  const handleNovelClick = (ch: NovelChapterItem) => {
    setActiveReader({ media: activeMedia, chapterNumber: ch.chapterNumber });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black overflow-y-auto no-scrollbar pb-32 text-white animate-in fade-in duration-200">
      {/* Top Floating Back Button */}
      <div className="fixed top-3 left-3 z-50">
        <button
          onClick={closeMediaDetails}
          className="p-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-xl hover:bg-white/20 transition-all cursor-pointer active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 1. TOP BACKDROP BANNER & TITLE METADATA OVERLAY */}
      <div className="relative w-full h-[380px] sm:h-[460px] overflow-hidden">
        {isLoadingDetails && !activeMedia.bannerImage && !activeMedia.coverImage ? (
          <div className="w-full h-full bg-neutral-900 animate-pulse" />
        ) : (activeMedia.bannerImage || activeMedia.coverImage) ? (
          <img
            src={activeMedia.bannerImage || activeMedia.coverImage}
            alt={activeMedia.title || 'Media Cover'}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-neutral-900" />
        )}

        {/* Layered Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />

        {/* Next Episode Countdown Badge (if airing) */}
        {activeMedia.nextEpisodeCountdown && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono font-bold text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-lg">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Next Ep in {activeMedia.nextEpisodeCountdown}</span>
          </div>
        )}
      </div>

      {/* 2. TITLE & METADATA SECTION */}
      <div className="relative -mt-24 px-4 space-y-3.5">
        {/* Title Field: Loading State vs Live Content */}
        {isLoadingDetails && !activeMedia.title ? (
          <div className="h-8 w-3/4 max-w-sm rounded-xl bg-white/10 animate-pulse" />
        ) : (
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            {activeMedia.title}
          </h1>
        )}

        {/* Rating, Studio & Favorite Row */}
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/90">
          <div className="flex items-center gap-2 flex-wrap min-h-[26px]">
            {/* Rating Field: Loading Skeleton vs Live Score */}
            {isLoadingDetails && !ratingScore ? (
              <div className="h-5 w-14 rounded-md bg-white/10 animate-pulse" />
            ) : ratingScore ? (
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-white font-bold text-sm">{ratingScore}</span>
              </div>
            ) : null}

            {/* Studio Field: Loading Skeleton vs Live Studio Name */}
            {isLoadingDetails && !studioName ? (
              <div className="h-5 w-24 rounded-full bg-white/10 animate-pulse" />
            ) : studioName ? (
              <div className="px-3.5 py-0.5 rounded-full border border-purple-500/40 bg-purple-950/40 text-white/90 font-medium text-xs backdrop-blur-md">
                {studioName}
              </div>
            ) : null}
          </div>

          {/* Real User Love / Heart Reaction */}
          {isLoadingDetails && !activeMedia.id ? (
            <div className="h-6 w-10 rounded-full bg-white/10 animate-pulse" />
          ) : (
            <button
              onClick={() => toggleFavorite(activeMedia)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer active:scale-95 ${
                isFavorite
                  ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                  : 'bg-white/5 border border-white/15 text-white/80 hover:text-white hover:bg-white/10'
              }`}
              aria-label={isFavorite ? 'Remove reaction' : 'Give love reaction'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/80'
                }`}
              />
              {isFavorite && <span className="font-bold text-xs text-rose-400">1</span>}
            </button>
          )}
        </div>

        {/* Airing Meta Info Row: Loading Skeleton vs Live Metadata */}
        {isLoadingDetails && !ageRating && !airingStatus && !releaseYear ? (
          <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
        ) : (ageRating || airingStatus || releaseYear) ? (
          <div className="flex items-center gap-2 text-xs text-white/90 font-medium">
            {ageRating && (
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>{ageRating}</span>
              </div>
            )}
            {ageRating && airingStatus && <span className="text-white/40">·</span>}
            {airingStatus && <span className="capitalize text-white/90">{airingStatus}</span>}
            {releaseYear && (
              <span className="px-2.5 py-0.5 rounded-full border border-amber-600/50 bg-[#24170e]/70 text-white text-xs font-semibold">
                {releaseYear}
              </span>
            )}
          </div>
        ) : null}

        {/* Genre Chips: Loading Skeleton vs Live Genre Pills */}
        {isLoadingDetails && (!activeMedia.genres || activeMedia.genres.length === 0) ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
          </div>
        ) : activeMedia.genres && activeMedia.genres.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {activeMedia.genres.map((genre) => (
              <span
                key={genre}
                className={`px-3.5 py-1 rounded-full border text-xs font-medium backdrop-blur-sm ${getGenrePillStyle(
                  genre
                )}`}
              >
                {genre}
              </span>
            ))}
          </div>
        ) : null}

        {/* PRIMARY ACTION ROW: Dynamic Add to Library Pill Button + Share Button */}
        <div className="flex items-center gap-3 pt-2">
          {/* Library Status Pill with dynamic status icon and vibrant color */}
          {(() => {
            const btn = getLibraryButtonDetails();
            return (
              <button
                onClick={() => setShowAddToLibrary(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-full font-bold text-sm transition-all cursor-pointer active:scale-[0.98] ${btn.className}`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            );
          })()}

          {/* Circular Share Button */}
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-[#4a4358] hover:bg-[#564e66] text-white flex items-center justify-center shrink-0 shadow-lg transition-all cursor-pointer active:scale-95"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 3. EPISODE / CHAPTER / VOLUME HEADER & ACTIONS */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {activeMedia.category === 'anime'
                  ? 'Episodes'
                  : activeMedia.category === 'manga'
                  ? 'Chapters'
                  : 'Volumes'}
              </h2>
              {activeMedia.category === 'anime' && runtimeMetricString && !isLoadingContent && (
                <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">
                  {runtimeMetricString}
                </span>
              )}
            </div>

            {/* Action Buttons (Download & Filter/View) */}
            <div className="flex items-center gap-1.5 text-white/80">
              <button
                onClick={() => showToast('Download options opened')}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowEpisodeSearch(true)}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Filter & explore"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* LOADING SPINNER STATE */}
          {isLoadingContent ? (
            <div className="flex items-center justify-center gap-2.5 py-6 text-white/70">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-xs font-medium text-white/70">
                {activeMedia.category === 'anime'
                  ? 'Loading episodes...'
                  : activeMedia.category === 'manga'
                  ? 'Loading chapters...'
                  : 'Loading volumes...'}
              </span>
            </div>
          ) : (
            <>
              {/* UPCOMING / NOT YET RELEASED NOTICE */}
              {isUpcoming && episodes.length === 0 && (
                <div className="p-4 rounded-2xl bg-[#141420] border border-purple-500/20 flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white">Upcoming Release</h4>
                    <p className="text-xs text-white/60">
                      This series has not aired any episodes yet. You will be notified automatically when Episode 1 drops.
                    </p>
                  </div>
                </div>
              )}

              {/* 4. DYNAMIC RANGE FILTER PILLS (e.g. 1-50, 51-100, 101-150, 151-200, 201-220) */}
              {ranges.length > 0 && totalCount > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {ranges.map((rangeStr, idx) => {
                    const isActive = selectedRangeIndex === idx;
                    return (
                      <button
                        key={rangeStr}
                        onClick={() => setSelectedRangeIndex(idx)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#3b1d5c] border border-purple-500 text-white shadow-md'
                            : 'bg-[#0e0e16] border border-white/15 text-white/80 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {rangeStr}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 5. INTERACTIVE EPISODE / CHAPTER / VOLUME GRID */}
              {activeMedia.category === 'anime' ? (
                displayedEpisodes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/50 bg-[#121218] rounded-2xl border border-white/5">
                    No aired episodes available yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-2 py-1">
                    {displayedEpisodes.map((ep) => {
                      const isCurrentWatched =
                        libraryEntry?.currentProgress !== undefined &&
                        libraryEntry.currentProgress === ep.number;

                      return (
                        <button
                          key={ep.id}
                          onClick={() => handleEpisodeClick(ep)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer font-bold text-xs sm:text-sm ${
                            isCurrentWatched
                              ? 'bg-[#18120c] border border-amber-500/80 text-amber-500 hover:bg-amber-600/20'
                              : 'bg-[#0b0b10] border border-white/15 text-white hover:border-purple-500/60 hover:bg-[#1a1a26]'
                          }`}
                        >
                          <span>{ep.number}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : activeMedia.category === 'manga' ? (
                displayedMangaChapters.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/50 bg-[#121218] rounded-2xl border border-white/5">
                    No chapters available yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-2 py-1">
                    {displayedMangaChapters.map((ch) => {
                      const isCurrentRead =
                        libraryEntry?.currentProgress !== undefined &&
                        libraryEntry.currentProgress === ch.chapterNumber;

                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleMangaClick(ch)}
                          title={ch.title || `Chapter ${ch.chapterNumber}`}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer font-bold text-xs sm:text-sm ${
                            isCurrentRead
                              ? 'bg-[#18120c] border border-amber-500/80 text-amber-500 hover:bg-amber-600/20'
                              : 'bg-[#0b0b10] border border-white/15 text-white hover:border-purple-500/60 hover:bg-[#1a1a26]'
                          }`}
                        >
                          <span>{ch.chapterNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                displayedNovelChapters.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/50 bg-[#121218] rounded-2xl border border-white/5">
                    No novel volumes available yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-2 py-1">
                    {displayedNovelChapters.map((ch) => {
                      const isCurrentRead =
                        libraryEntry?.currentProgress !== undefined &&
                        libraryEntry.currentProgress === ch.chapterNumber;

                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleNovelClick(ch)}
                          title={ch.title || `Volume ${ch.volume || ch.chapterNumber}`}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer font-bold text-xs sm:text-sm ${
                            isCurrentRead
                              ? 'bg-[#18120c] border border-amber-500/80 text-amber-500 hover:bg-amber-600/20'
                              : 'bg-[#0b0b10] border border-white/15 text-white hover:border-purple-500/60 hover:bg-[#1a1a26]'
                          }`}
                        >
                          <span className="text-[9px] text-purple-400 font-semibold leading-none mb-0.5">VOL</span>
                          <span>{ch.volume || ch.chapterNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Collapsible description toggle chevron */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            className="p-1 text-white/60 hover:text-white cursor-pointer"
            aria-label="Toggle description"
          >
            {isDescriptionExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* DESCRIPTION & SYNOPSIS: Loading Skeleton vs Real Content */}
        {isDescriptionExpanded && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            <h2 className="text-sm font-bold text-white tracking-wide">Description</h2>
            {isLoadingDetails && !activeMedia.description ? (
              <div className="space-y-2 py-1">
                <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-4/6 rounded bg-white/10 animate-pulse" />
              </div>
            ) : activeMedia.description ? (
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed whitespace-pre-line">
                {activeMedia.description}
              </p>
            ) : null}
            {activeMedia.sourceNote && (
              <p className="text-xs text-white/40 italic">{activeMedia.sourceNote}</p>
            )}
          </div>
        )}

        {/* FRANCHISE NAVIGATION BUTTONS: PREQUEL / SEQUEL / THEMES / WATCH ORDER */}
        <div className="pt-3 space-y-2.5">
          {(activeMedia.hasPrequel || activeMedia.hasSequel) && (
            <div className="flex gap-2">
              {activeMedia.hasPrequel && (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 border border-blue-500/30 text-center font-black text-xs tracking-wider uppercase text-blue-200">
                  PREQUEL
                </div>
              )}
              {activeMedia.hasSequel && (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-900/60 to-emerald-900/60 border border-emerald-500/30 text-center font-black text-xs tracking-wider uppercase text-emerald-200">
                  SEQUEL
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => showToast('Opening Opening/Ending Themes...')}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#14141B] border border-white/10 font-bold text-xs text-white hover:bg-white/15 transition-all cursor-pointer"
            >
              <Music className="w-4 h-4 text-purple-400" />
              <span>Themes</span>
            </button>

            <button
              onClick={() => setShowWatchOrder(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#14141B] border border-white/10 font-bold text-xs text-white hover:bg-white/15 transition-all cursor-pointer"
            >
              <ListOrdered className="w-4 h-4 text-purple-400" />
              <span>Watch Order</span>
            </button>
          </div>
        </div>

        {/* REVIEWS (Only rendered when real user reviews exist) */}
        {activeMedia.reviews && activeMedia.reviews.length > 0 && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Reviews</h2>
              <button
                onClick={() => showToast('Review modal opened')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-400 font-bold text-xs border border-purple-500/30 hover:bg-purple-600/30 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write a Review</span>
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {activeMedia.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="min-w-[280px] max-w-[320px] p-3.5 bg-[#14141C] rounded-2xl border border-white/10 space-y-2 shrink-0 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rev.authorAvatar ? (
                        <img
                          src={rev.authorAvatar}
                          alt={rev.authorName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
                          {rev.authorName ? rev.authorName.slice(0, 1) : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{rev.authorName}</div>
                        <div className="text-[10px] text-white/50">+{rev.helpfulCount} helpful</div>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-white/10 text-amber-400 font-black text-xs">
                      {rev.score}
                    </div>
                  </div>
                  {rev.headline && (
                    <h4 className="text-xs font-bold text-white line-clamp-1">{rev.headline}</h4>
                  )}
                  <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">{rev.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHARACTERS */}
        {activeMedia.characters && activeMedia.characters.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Characters</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {activeMedia.characters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharacter(char)}
                  className="w-24 sm:w-28 shrink-0 cursor-pointer group"
                >
                  <PosterImage
                    src={char.image}
                    alt={char.name}
                    className="aspect-[3/4] rounded-2xl border border-white/5 group-hover:border-purple-500/50 transition-all shadow-md"
                  />
                  <h4 className="mt-1.5 text-xs font-bold text-white line-clamp-1 group-hover:text-purple-300">
                    {char.name}
                  </h4>
                  <p className="text-[10px] text-white/50">{char.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOICE ACTORS */}
        {activeMedia.voiceActors && activeMedia.voiceActors.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Voice Actors</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {activeMedia.voiceActors.map((va) => (
                <div key={va.id} className="w-24 sm:w-28 shrink-0">
                  <PosterImage
                    src={va.image}
                    alt={va.name}
                    className="aspect-[3/4] rounded-2xl border border-white/5 shadow-md"
                  />
                  <h4 className="mt-1.5 text-xs font-bold text-white line-clamp-1">{va.name}</h4>
                  <p className="text-[10px] text-white/50">{va.characterRole}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELATIONS */}
        {activeMedia.relations && activeMedia.relations.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Relations</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {activeMedia.relations.map((rel) => (
                <div key={rel.id} className="w-24 sm:w-28 shrink-0">
                  <PosterImage
                    src={rel.coverImage}
                    alt={rel.title}
                    className="aspect-[3/4] rounded-2xl border border-white/5 shadow-md"
                  />
                  <h4 className="mt-1.5 text-xs font-bold text-white line-clamp-1">{rel.title}</h4>
                  <p className="text-[10px] text-cyan-400 font-semibold">{rel.relationType}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDATIONS */}
        {activeMedia.recommendations && activeMedia.recommendations.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Recommendations</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {activeMedia.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() =>
                    openMediaDetails({
                      id: rec.id,
                      title: rec.title,
                      coverImage: rec.coverImage,
                      category: rec.category || activeMedia.category,
                      format: (rec.format as any) || activeMedia.format,
                      status: 'Releasing',
                      score: rec.score,
                      year: 2026,
                      genres: activeMedia.genres,
                      description: 'Recommended title from community suggestions.',
                    })
                  }
                  className="w-24 sm:w-28 shrink-0 group cursor-pointer"
                >
                  <PosterImage
                    src={rec.coverImage}
                    alt={rec.title}
                    className="aspect-[3/4] rounded-2xl border border-white/5 shadow-md group-hover:scale-105 transition-transform"
                  >
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#0088FF] text-white font-extrabold text-[10px]">
                      {getRatingDisplay(rec)}
                    </div>
                  </PosterImage>
                  <h4 className="mt-1.5 text-xs font-bold text-white line-clamp-1 group-hover:text-purple-300">
                    {rec.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
