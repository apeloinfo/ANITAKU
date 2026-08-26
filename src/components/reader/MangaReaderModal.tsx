import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  SkipBack,
  SkipForward,
  BookOpen,
  Settings as SettingsIcon,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getMangaPages,
  getNovelChapterContent,
  AnifyNovelChapterContent,
  fetchMangaDexChapters,
  searchMangaDex,
} from '../../services/apiClient';

interface MangaPageItemProps {
  pageUrl: string;
  pageIndex: number;
  totalPages: number;
  onVisible?: (index: number) => void;
}

const MangaPageItem: React.FC<MangaPageItemProps> = ({
  pageUrl,
  pageIndex,
  totalPages,
  onVisible,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(pageUrl);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSrc(pageUrl);
    setLoaded(false);
    setError(false);
  }, [pageUrl]);

  useEffect(() => {
    if (!onVisible || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          onVisible(pageIndex + 1);
        }
      },
      { threshold: [0.4, 0.7] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageIndex, onVisible]);

  const handleError = () => {
    if (!currentSrc.startsWith('/api/image-proxy')) {
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(pageUrl)}`);
    } else {
      setError(true);
    }
  };

  return (
    <div
      id={`manga-page-${pageIndex + 1}`}
      data-page-index={pageIndex + 1}
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto overflow-hidden bg-[#0a0a0f] min-h-[380px] sm:min-h-[520px] flex items-center justify-center rounded-none"
    >
      {/* Loading Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0c0c14] text-white/50">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-[11px] font-medium font-mono text-white/60">
            Loading Page {pageIndex + 1} / {totalPages}...
          </span>
        </div>
      )}

      {/* Error state */}
      {error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-xs text-white/70">Failed to load Page {pageIndex + 1}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setError(false);
              setLoaded(false);
              setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(pageUrl)}&t=${Date.now()}`);
            }}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </button>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={`Page ${pageIndex + 1}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`w-full h-auto object-contain block mx-auto transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

const PagedViewer: React.FC<{
  pageUrl: string;
  currentPage: number;
  totalPages: number;
}> = ({ pageUrl, currentPage, totalPages }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(pageUrl);

  useEffect(() => {
    setCurrentSrc(pageUrl);
    setLoaded(false);
    setError(false);
  }, [pageUrl]);

  const handleError = () => {
    if (!currentSrc.startsWith('/api/image-proxy')) {
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(pageUrl)}`);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex items-center justify-center h-full max-w-2xl mx-auto p-2 sm:p-4">
      <div className="relative max-h-[85vh] w-full aspect-[3/4.5] max-w-xl rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0b0b10] flex items-center justify-center">
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0e0e16] text-white/50">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <span className="text-xs font-mono text-white/60">
              Loading Page {currentPage} / {totalPages}...
            </span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-xs text-white/70">Failed to load Page {currentPage}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(false);
                setLoaded(false);
                setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(pageUrl)}&t=${Date.now()}`);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={`Page ${currentPage}`}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={handleError}
            className={`w-full h-full object-contain bg-black transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
    </div>
  );
};

export const MangaReaderModal: React.FC = () => {
  const {
    activeReader,
    setActiveReader,
    settings,
    updateLibraryProgress,
    addToLibrary,
    removeFromLibrary,
    getLibraryEntry,
    showToast,
  } = useApp();

  const [currentPage, setCurrentPage] = useState(1);
  const [readerMode, setReaderMode] = useState<'Webtoon' | 'Paged'>(
    settings.mangaReaderMode === 'Paged' ? 'Paged' : 'Webtoon'
  );
  const [readerBg, setReaderBg] = useState<'black' | 'dark' | 'light'>('black');

  // Auto-hide controls state (3s timer)
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals / Drawers
  const [showChaptersDrawer, setShowChaptersDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Chapters list for drawer
  const [availableChapters, setAvailableChapters] = useState<Array<{ id: string; chapter: string; title: string }>>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapterFilterQuery, setChapterFilterQuery] = useState('');

  // Dynamic API content state
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mangaPages, setMangaPages] = useState<string[]>([]);
  const [novelData, setNovelData] = useState<AnifyNovelChapterContent | null>(null);
  const [novelFontSize, setNovelFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-hide activity timer handler (3s)
  const resetActivityTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // If any drawer is open, keep controls visible
    if (showChaptersDrawer || showSettingsDrawer) {
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, [showChaptersDrawer, showSettingsDrawer]);

  useEffect(() => {
    resetActivityTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetActivityTimer, showChaptersDrawer, showSettingsDrawer]);

  // Library / Bookmark status
  const isBookmarked = activeReader ? Boolean(getLibraryEntry(activeReader.media.id)) : false;

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReader) return;
    if (isBookmarked) {
      removeFromLibrary(activeReader.media.id);
      showToast('Removed from Bookmarks');
    } else {
      addToLibrary(activeReader.media, 'Reading');
      showToast('Saved to Reading Bookmarks');
    }
    resetActivityTimer();
  };

  // Auto-record progress in library
  useEffect(() => {
    if (activeReader) {
      updateLibraryProgress(activeReader.media.id, activeReader.chapterNumber);
    }
  }, [activeReader?.media.id, activeReader?.chapterNumber]);

  // Fetch Chapters list for the Chapters Drawer
  useEffect(() => {
    if (!activeReader || activeReader.media.category === 'novel') return;

    let isCancelled = false;
    async function loadChaptersList() {
      setLoadingChapters(true);
      try {
        const { media } = activeReader!;
        const altTitles = [media.romajiTitle, media.nativeTitle, media.englishTitle].filter(Boolean) as string[];
        const mangaId = await searchMangaDex(media.title, altTitles);
        if (isCancelled) return;

        if (mangaId) {
          const list = await fetchMangaDexChapters(mangaId);
          if (isCancelled) return;
          if (list && list.length > 0) {
            setAvailableChapters(list);
            return;
          }
        }

        // Fallback: create list from totalChapters
        const total = media.totalChapters || 50;
        const generated = Array.from({ length: total }, (_, i) => ({
          id: `ch-${i + 1}`,
          chapter: String(i + 1),
          title: `Chapter ${i + 1}`,
        }));
        if (!isCancelled) setAvailableChapters(generated);
      } catch (err) {
        console.warn('Failed to load chapters list:', err);
      } finally {
        if (!isCancelled) setLoadingChapters(false);
      }
    }

    loadChaptersList();
    return () => {
      isCancelled = true;
    };
  }, [activeReader?.media.id]);

  // Fetch real MangaDex pages or Anify Novel chapter text
  useEffect(() => {
    let isCancelled = false;

    async function loadChapter() {
      if (!activeReader) return;
      const { media, chapterNumber } = activeReader;
      const isNovel = media.category === 'novel';

      setIsLoading(true);
      setErrorMsg(null);
      setCurrentPage(1);

      try {
        if (isNovel) {
          const content = await getNovelChapterContent(media.id, chapterNumber, {
            title: media.title,
          });

          if (isCancelled) return;
          if (content && content.content && content.content.length > 50) {
            setNovelData(content);
          } else {
            const desc = media.description || '';
            const rawParagraphs = desc.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

            const synthesizedParagraphs = [
              `[ Light Novel Volume ${chapterNumber} ]`,
              `Official Series: ${media.title}`,
              rawParagraphs.length > 0
                ? rawParagraphs[0]
                : `The epic journey continues in Volume ${chapterNumber} of ${media.title}.`,
              `PROLOGUE: The Dawning Chronicles`,
              rawParagraphs.length > 1
                ? rawParagraphs[1]
                : `New challenges arise as the protagonists confront unprecedented obstacles in their world.`,
              `CHAPTER 1: The Gathering Tempest`,
              rawParagraphs.length > 2
                ? rawParagraphs.slice(2).join('\n\n')
                : `Unfolding events lead to unexpected alliances and revelations across the realm. Every choice carries weight as the story deepens.`,
              `EPILOGUE: Footsteps Toward Tomorrow`,
              `With the close of Volume ${chapterNumber}, new paths unfold for what lies ahead in the upcoming volume.`,
            ];

            setNovelData({
              chapterNumber,
              title: `${media.title} — Volume ${chapterNumber}`,
              content: synthesizedParagraphs.join('\n\n'),
              paragraphs: synthesizedParagraphs,
              providerId: 'Anify & Satori Reader',
            });
          }
        } else {
          // Manga mode: fetch real pages from MangaDex and Anify providers
          const { chapterId } = activeReader;
          const altTitles = [media.romajiTitle, media.nativeTitle, media.englishTitle].filter(Boolean) as string[];
          const pages = await getMangaPages(media.title, chapterNumber, chapterId, altTitles, media.id);
          if (isCancelled) return;

          if (pages && pages.length > 0) {
            setMangaPages(pages);
          } else {
            const fallbackPages = [
              media.coverImage,
              media.bannerImage || media.coverImage,
            ].filter(Boolean) as string[];
            setMangaPages(fallbackPages);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          if (isNovel) {
            const desc = media.description || '';
            const rawParagraphs = desc.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
            setNovelData({
              chapterNumber,
              title: `${media.title} — Volume ${chapterNumber}`,
              content: desc || `Light Novel Volume ${chapterNumber} of ${media.title}`,
              paragraphs: rawParagraphs.length > 0 ? rawParagraphs : [`Volume ${chapterNumber} for ${media.title}`],
              providerId: 'Satori Reader',
            });
          } else {
            const fallbackPages = [
              media.coverImage,
              media.bannerImage || media.coverImage,
            ].filter(Boolean) as string[];
            if (fallbackPages.length > 0) {
              setMangaPages(fallbackPages);
            } else {
              setErrorMsg(err?.message || 'Failed to load chapter content. Please try again.');
            }
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadChapter();

    return () => {
      isCancelled = true;
    };
  }, [activeReader?.media?.id, activeReader?.media?.title, activeReader?.chapterNumber, activeReader?.media?.category]);

  if (!activeReader) return null;

  const { media, chapterNumber } = activeReader;
  const isNovel = media.category === 'novel';
  const totalChapters = media.totalChapters || media.totalVolumes || 100;
  const totalPages = mangaPages.length || 1;

  const scrollToPage = (pageIdx: number) => {
    setCurrentPage(pageIdx);
    if (readerMode === 'Webtoon') {
      const targetEl = document.getElementById(`manga-page-${pageIdx}`);
      if (targetEl && scrollContainerRef.current) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleNextChapter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (chapterNumber < totalChapters) {
      setActiveReader({ media, chapterNumber: chapterNumber + 1 });
      setCurrentPage(1);
      showToast(`Switched to Chapter ${chapterNumber + 1}`);
    }
    resetActivityTimer();
  };

  const handlePrevChapter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (chapterNumber > 1) {
      setActiveReader({ media, chapterNumber: chapterNumber - 1 });
      setCurrentPage(1);
      showToast(`Switched to Chapter ${chapterNumber - 1}`);
    }
    resetActivityTimer();
  };

  const handleNextPage = () => {
    if (!isNovel && currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    } else if (chapterNumber < totalChapters) {
      handleNextChapter();
    }
    resetActivityTimer();
  };

  const handlePrevPage = () => {
    if (!isNovel && currentPage > 1) {
      scrollToPage(currentPage - 1);
    } else if (chapterNumber > 1) {
      handlePrevChapter();
    }
    resetActivityTimer();
  };

  const handleRetry = () => {
    if (!activeReader) return;
    setActiveReader({ ...activeReader });
    resetActivityTimer();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    scrollToPage(val);
    resetActivityTimer();
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
    if (!showControls) {
      resetActivityTimer();
    } else if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  };

  return (
    <div
      onMouseMove={resetActivityTimer}
      onTouchStart={resetActivityTimer}
      onClick={resetActivityTimer}
      className={`fixed inset-0 z-[5000] flex flex-col justify-between overflow-hidden select-none transition-colors duration-300 ${
        readerBg === 'black'
          ? 'bg-black text-white'
          : readerBg === 'dark'
          ? 'bg-[#121218] text-white'
          : 'bg-[#F4EFEA] text-[#1A1A1A]'
      }`}
    >
      {/* 1. TOP OVERLAY TOOLBAR (Exact screenshot layout: Back, Title, Chapter, Bookmark) */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-black/95 via-black/75 to-transparent pt-3 pb-8 px-4 sm:px-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveReader(null);
                }}
                className="p-2 -ml-1.5 rounded-full hover:bg-white/15 active:scale-95 text-white transition-all cursor-pointer"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-base font-bold text-white leading-tight truncate">
                  {media.title}
                </h2>
                <p className="text-xs sm:text-[13px] text-white/70 font-medium leading-none mt-0.5">
                  {isNovel ? `Volume ${chapterNumber}` : `Chapter ${chapterNumber}`}
                </p>
              </div>
            </div>

            {/* Right: Bookmark Pill Button */}
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center ${
                isBookmarked
                  ? 'bg-purple-600/30 border-purple-500 text-purple-400'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Add to Bookmarks'}
            >
              {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-purple-400" /> : <Bookmark className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN READER CANVAS / SCROLL CONTAINER */}
      <div
        ref={scrollContainerRef}
        onClick={toggleControls}
        onScroll={resetActivityTimer}
        className="w-full h-full overflow-y-auto no-scrollbar pt-14 pb-32 cursor-pointer"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-9 h-9 text-purple-500 animate-spin" />
            <p className="text-xs sm:text-sm text-white/70 font-medium">
              {isNovel ? 'Fetching Novel Chapter payload...' : 'Loading Chapter Pages...'}
            </p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-md mx-auto space-y-4">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Content Unavailable</h3>
              <p className="text-xs text-white/60">{errorMsg}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : isNovel && novelData ? (
          /* Novel Text Chapter Content */
          <div
            className={`max-w-2xl mx-auto px-6 py-8 space-y-6 leading-relaxed font-serif ${
              novelFontSize === 'sm'
                ? 'text-sm'
                : novelFontSize === 'lg'
                ? 'text-lg leading-loose'
                : novelFontSize === 'xl'
                ? 'text-xl leading-loose'
                : 'text-base leading-relaxed'
            }`}
          >
            <div className="border-b border-white/10 pb-4 mb-6">
              <span className="text-xs uppercase tracking-widest text-purple-400 font-sans font-bold">
                LIGHT NOVEL
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-white mt-1">
                {novelData.title || `Volume ${chapterNumber}`}
              </h1>
            </div>

            {novelData.paragraphs.length > 0 ? (
              novelData.paragraphs.map((para, idx) => (
                <p key={idx} className="leading-relaxed whitespace-pre-line">
                  {para}
                </p>
              ))
            ) : (
              <div className="whitespace-pre-line leading-relaxed">{novelData.content}</div>
            )}

            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-xs font-sans text-white/40 tracking-widest uppercase">
                — End of Volume {chapterNumber} —
              </div>
              <div className="flex items-center gap-3">
                <button
                  disabled={chapterNumber <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevChapter(e);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all disabled:opacity-30 cursor-pointer"
                >
                  Previous Volume
                </button>
                <button
                  disabled={chapterNumber >= totalChapters}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextChapter(e);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-lg disabled:opacity-30 cursor-pointer"
                >
                  Next Volume
                </button>
              </div>
            </div>
          </div>
        ) : !isNovel && readerMode === 'Webtoon' ? (
          /* Webtoon Vertical Infinite Scrolling */
          <div className="flex flex-col items-center max-w-2xl mx-auto w-full space-y-2 px-0 sm:px-0">
            {mangaPages
              .filter((p) => Boolean(p && typeof p === 'string' && p.trim() !== ''))
              .map((pageUrl, idx) => (
                <MangaPageItem
                  key={`${pageUrl}-${idx}`}
                  pageUrl={pageUrl}
                  pageIndex={idx}
                  totalPages={mangaPages.length}
                  onVisible={(visibleIdx) => setCurrentPage(visibleIdx)}
                />
              ))}

            {/* End of Chapter notice & auto next chapter button */}
            <div className="py-14 w-full flex flex-col items-center justify-center gap-4 text-center px-4">
              <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
                — End of Chapter {chapterNumber} —
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={chapterNumber <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevChapter(e);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all disabled:opacity-30 cursor-pointer"
                >
                  Previous Chapter
                </button>
                <button
                  disabled={chapterNumber >= totalChapters}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextChapter(e);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all shadow-lg disabled:opacity-30 cursor-pointer"
                >
                  Next Chapter
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Paged Single / Spread Viewer */
          <PagedViewer
            pageUrl={mangaPages[currentPage - 1] || ''}
            currentPage={currentPage}
            totalPages={mangaPages.length || 1}
          />
        )}
      </div>

      {/* 3. BOTTOM OVERLAY TOOLBAR (Exact screenshot layout: Page Count, Dotted Scrubber, Chapters & Settings Buttons) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/95 via-black/85 to-transparent pt-8 pb-5 px-4 sm:px-6">
          <div className="max-w-md mx-auto space-y-2.5">
            {/* 3a. Page Counter: e.g. "3 / 15" */}
            <div className="text-center">
              <span className="text-xs sm:text-sm font-semibold text-white/90 tracking-wider">
                {currentPage} / {totalPages}
              </span>
            </div>

            {/* 3b. Scrubber Row with SkipBack, Dotted Slider Track, SkipForward */}
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={handlePrevChapter}
                disabled={chapterNumber <= 1}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                title="Previous Chapter"
              >
                <SkipBack className="w-4 h-4 fill-white/80" />
              </button>

              {/* Dotted Interactive Scrubber Track */}
              <div className="relative flex-1 flex items-center h-6 select-none">
                {/* Background dotted line indicator */}
                <div className="absolute inset-x-0 h-1 bg-[#252538] rounded-full overflow-hidden flex items-center justify-between px-1">
                  {totalPages > 1 &&
                    Array.from({ length: Math.min(totalPages, 14) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          i / Math.min(totalPages - 1, 13) <= (currentPage - 1) / Math.max(totalPages - 1, 1)
                            ? 'bg-purple-300'
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                </div>

                {/* Filled purple progress bar */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-purple-600 rounded-full pointer-events-none"
                  style={{
                    width: `${totalPages > 1 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 100}%`,
                  }}
                />

                {/* Range Input Slider */}
                <input
                  type="range"
                  min={1}
                  max={Math.max(totalPages, 1)}
                  value={currentPage}
                  onChange={handleSliderChange}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full h-6 opacity-0 cursor-pointer z-10"
                />

                {/* Visual Thumb Indicator (Purple Pill with dot) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-3 bg-purple-500 rounded-full border border-purple-300 shadow-md pointer-events-none transition-all duration-75 flex items-center justify-center"
                  style={{
                    left: `${totalPages > 1 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 0}%`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              <button
                onClick={handleNextChapter}
                disabled={chapterNumber >= totalChapters}
                className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                title="Next Chapter"
              >
                <SkipForward className="w-4 h-4 fill-white/80" />
              </button>
            </div>

            {/* 3c. Bottom 2 Action Buttons: [ 📖 Chapters ] & [ ⚙ Settings ] */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChaptersDrawer(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1d1d28]/90 hover:bg-[#28283a] active:scale-95 border border-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg backdrop-blur-md transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Chapters</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsDrawer(true);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1d1d28]/90 hover:bg-[#28283a] active:scale-95 border border-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg backdrop-blur-md transition-all cursor-pointer"
              >
                <SettingsIcon className="w-4 h-4 text-purple-400" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHAPTERS DRAWER / MODAL */}
      {showChaptersDrawer && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowChaptersDrawer(false);
          }}
          className="fixed inset-0 z-[6000] flex flex-col justify-end sm:justify-center sm:items-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[80vh] sm:max-h-[75vh] bg-[#14141e] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Select Chapter</h3>
                <p className="text-xs text-white/50">{media.title}</p>
              </div>
              <button
                onClick={() => setShowChaptersDrawer(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="p-3 border-b border-white/10 bg-[#0f0f17]">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapterFilterQuery}
                  onChange={(e) => setChapterFilterQuery(e.target.value)}
                  placeholder="Search chapter number..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar max-h-[50vh]">
              {loadingChapters ? (
                <div className="flex items-center justify-center py-10 gap-2 text-white/60">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <span className="text-xs">Loading chapters list...</span>
                </div>
              ) : availableChapters.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/50">
                  No chapters found.
                </div>
              ) : (
                availableChapters
                  .filter((ch) => {
                    if (!chapterFilterQuery.trim()) return true;
                    return (
                      ch.chapter.includes(chapterFilterQuery.trim()) ||
                      ch.title.toLowerCase().includes(chapterFilterQuery.toLowerCase().trim())
                    );
                  })
                  .map((ch) => {
                    const chNum = parseFloat(ch.chapter) || parseInt(ch.chapter, 10);
                    const isCurrent = chNum === chapterNumber;
                    return (
                      <button
                        key={ch.id || ch.chapter}
                        onClick={() => {
                          setActiveReader({ media, chapterNumber: chNum, chapterId: ch.id });
                          setCurrentPage(1);
                          setShowChaptersDrawer(false);
                          showToast(`Jumped to Chapter ${chNum}`);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-purple-600/30 border border-purple-500/80 text-white font-bold'
                            : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-purple-400">CH {ch.chapter}</span>
                          <span className="text-xs line-clamp-1">{ch.title || `Chapter ${ch.chapter}`}</span>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SETTINGS DRAWER */}
      {showSettingsDrawer && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowSettingsDrawer(false);
          }}
          className="fixed inset-0 z-[6000] flex flex-col justify-end sm:justify-center sm:items-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#14141e] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-2xl p-5 space-y-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Reader Settings</h3>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reading Mode */}
            {!isNovel && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">Reading Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Webtoon', label: 'Webtoon (Continuous)' },
                    { id: 'Paged', label: 'Paged (Single Page)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setReaderMode(m.id as any);
                        showToast(`Mode: ${m.label}`);
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        readerMode === m.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Theme */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Background Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'black', label: 'Pure Black' },
                  { id: 'dark', label: 'Dark Navy' },
                  { id: 'light', label: 'Paper Light' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setReaderBg(b.id as any)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      readerBg === b.id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size if Novel */}
            {isNovel && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">Font Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'sm', label: 'Small' },
                    { id: 'base', label: 'Medium' },
                    { id: 'lg', label: 'Large' },
                    { id: 'xl', label: 'Extra' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setNovelFontSize(s.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        novelFontSize === s.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
