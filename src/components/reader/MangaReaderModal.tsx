import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  BookOpen,
  LayoutGrid,
  Sun,
  Moon,
  Columns,
  Maximize2,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMangaPages, getNovelChapterContent, AnifyNovelChapterContent } from '../../services/apiClient';

export const MangaReaderModal: React.FC = () => {
  const {
    activeReader,
    setActiveReader,
    settings,
    updateLibraryProgress,
    showToast,
  } = useApp();

  const [currentPage, setCurrentPage] = useState(1);
  const [readerMode, setReaderMode] = useState<'Webtoon' | 'Paged'>(
    settings.mangaReaderMode === 'Paged' ? 'Paged' : 'Webtoon'
  );
  const [showToolbars, setShowToolbars] = useState(true);
  const [readerBg, setReaderBg] = useState<'black' | 'dark' | 'light'>('black');
  const [showReaderSettings, setShowReaderSettings] = useState(false);

  // Dynamic API state
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mangaPages, setMangaPages] = useState<string[]>([]);
  const [novelData, setNovelData] = useState<AnifyNovelChapterContent | null>(null);

  // Auto-record progress in library
  useEffect(() => {
    if (activeReader) {
      updateLibraryProgress(activeReader.media.id, activeReader.chapterNumber);
    }
  }, [activeReader?.media.id, activeReader?.chapterNumber]);

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
          if (content && content.content) {
            setNovelData(content);
          } else {
            setErrorMsg(`Chapter ${chapterNumber} text is currently unavailable from novel providers.`);
          }
        } else {
          // Manga mode: fetch real pages from MangaDex
          const pages = await getMangaPages(media.title, chapterNumber);
          if (isCancelled) return;

          if (pages && pages.length > 0) {
            setMangaPages(pages);
          } else {
            setErrorMsg(`Chapter ${chapterNumber} pages are currently unavailable from MangaDex.`);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(err?.message || 'Failed to load chapter content. Please try again.');
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

  const handleNextPage = () => {
    if (!isNovel && currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    } else if (chapterNumber < totalChapters) {
      setActiveReader({ media, chapterNumber: chapterNumber + 1 });
      setCurrentPage(1);
      showToast(`Started Chapter ${chapterNumber + 1}`);
    }
  };

  const handlePrevPage = () => {
    if (!isNovel && currentPage > 1) {
      setCurrentPage((p) => p - 1);
    } else if (chapterNumber > 1) {
      setActiveReader({ media, chapterNumber: chapterNumber - 1 });
      setCurrentPage(1);
      showToast(`Switched to Chapter ${chapterNumber - 1}`);
    }
  };

  const handleRetry = () => {
    if (!activeReader) return;
    setActiveReader({ ...activeReader });
  };

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col justify-between overflow-hidden select-none transition-colors duration-300 ${
        readerBg === 'black'
          ? 'bg-black text-white'
          : readerBg === 'dark'
          ? 'bg-[#181824] text-white'
          : 'bg-[#F4EFEA] text-[#1A1A1A]'
      }`}
    >
      {/* 1. TOP TOOLBAR */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-black/85 backdrop-blur-xl border-b border-white/10 text-white transition-transform duration-300 ${
          showToolbars ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveReader(null)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold line-clamp-1">{media.title}</h2>
            <p className="text-xs text-purple-300 font-medium">
              {isNovel ? `Volume / Chapter ${chapterNumber}` : `Chapter ${chapterNumber}`}
              {!isNovel && mangaPages.length > 0 && ` · ${mangaPages.length} Pages`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNovel && (
            <button
              onClick={() => {
                const nextMode = readerMode === 'Webtoon' ? 'Paged' : 'Webtoon';
                setReaderMode(nextMode);
                showToast(`Mode: ${nextMode}`);
              }}
              className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold border border-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              {readerMode}
            </button>
          )}

          {/* Reader Settings */}
          <button
            onClick={() => setShowReaderSettings(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN READER CANVAS / SCROLL AREA */}
      <div
        onClick={() => setShowToolbars(!showToolbars)}
        className="w-full h-full overflow-y-auto no-scrollbar pt-16 pb-20 cursor-pointer"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-sm text-white/70 font-medium">
              {isNovel ? 'Fetching Novel Chapter payload from Anify...' : 'Fetching MangaDex Chapter pages...'}
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
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-6 leading-relaxed text-sm sm:text-base font-serif">
            <h1 className="text-2xl font-bold font-sans tracking-tight mb-6">
              {novelData.title || `Chapter ${chapterNumber}`}
            </h1>
            {novelData.paragraphs.length > 0 ? (
              novelData.paragraphs.map((para, idx) => (
                <p key={idx} className="leading-relaxed whitespace-pre-line">
                  {para}
                </p>
              ))
            ) : (
              <div className="whitespace-pre-line leading-relaxed">{novelData.content}</div>
            )}
            <div className="py-12 text-center text-xs font-sans text-white/40 tracking-widest uppercase">
              — End of Chapter {chapterNumber} —
            </div>
          </div>
        ) : !isNovel && readerMode === 'Webtoon' ? (
          /* Webtoon Vertical Infinite Scrolling */
          <div className="flex flex-col items-center max-w-2xl mx-auto w-full space-y-1">
            {mangaPages.map((pageUrl, idx) => (
              <div key={idx} className="relative w-full overflow-hidden shadow-2xl bg-black/40 min-h-[400px]">
                <img
                  src={pageUrl}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono text-white/70">
                  {idx + 1} / {mangaPages.length}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Paged Single / Spread Viewer */
          <div className="flex items-center justify-center h-full max-w-2xl mx-auto p-4">
            <div className="relative max-h-[80vh] aspect-[3/4.5] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              {mangaPages[currentPage - 1] && (
                <img
                  src={mangaPages[currentPage - 1]}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain bg-black"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM TOOLBAR & CHAPTER NAVIGATOR */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/85 backdrop-blur-xl border-t border-white/10 text-white space-y-2 transition-transform duration-300 ${
          showToolbars ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Prev Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevPage();
            }}
            disabled={isNovel ? chapterNumber <= 1 : currentPage <= 1 && chapterNumber <= 1}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isNovel ? 'Prev Chapter' : 'Prev'}</span>
          </button>

          {/* Page Counter / Chapter Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/70">
              {isNovel
                ? `Chapter ${chapterNumber} of ${totalChapters}`
                : `Page ${currentPage} / ${totalPages}`}
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextPage();
            }}
            disabled={chapterNumber >= totalChapters && (!isNovel ? currentPage >= totalPages : true)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-bold transition-all shadow-lg disabled:opacity-30 cursor-pointer"
          >
            <span>{isNovel ? 'Next Chapter' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. READER SETTINGS DRAWER */}
      {showReaderSettings && (
        <div className="fixed inset-0 z-[6000] flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm h-full bg-[#111118] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Reader Settings</h3>
              <button
                onClick={() => setShowReaderSettings(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Background Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Background</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'black', label: 'Black' },
                  { id: 'dark', label: 'Dark' },
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

            {/* Reading Mode (Manga only) */}
            {!isNovel && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Webtoon', 'Paged'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setReaderMode(m as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        readerMode === m
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {m}
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
