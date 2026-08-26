import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Check, ChevronDown, Loader2, Play, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EpisodeItem, MangaChapterItem, NovelChapterItem } from '../../types';
import {
  fetchMediaEpisodes,
  fetchMediaMangaChapters,
  fetchMediaNovelChapters,
} from '../../services/apiClient';

interface SearchItem {
  id: string | number;
  number: number;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  filler?: boolean;
}

export const EpisodeSearchModal: React.FC = () => {
  const {
    selectedMedia,
    showEpisodeSearch,
    setShowEpisodeSearch,
    setActiveVideoEpisode,
    setActiveReader,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('Anify Fast (HLS)');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const sources = [
    'Anify Fast (HLS)',
    'GogoAnime Primary',
    'Zoro Sub/Dub',
    'MangaDex Official',
    'Global Fallback',
  ];

  useEffect(() => {
    let isCancelled = false;

    async function loadItems() {
      if (!selectedMedia) return;
      setIsLoading(true);

      try {
        if (selectedMedia.category === 'anime') {
          const liveEps = await fetchMediaEpisodes(selectedMedia);
          if (!isCancelled) {
            setItems(
              liveEps.map((ep) => ({
                id: ep.id,
                number: ep.number,
                title: ep.title || `Episode ${ep.number}`,
                subtitle: ep.filler ? 'Filler' : 'Canon Airing',
                thumbnail: ep.thumbnail,
                filler: ep.filler,
              }))
            );
          }
        } else if (selectedMedia.category === 'manga') {
          const liveManga = await fetchMediaMangaChapters(selectedMedia);
          if (!isCancelled) {
            setItems(
              liveManga.map((ch) => ({
                id: ch.id,
                number: ch.chapterNumber,
                title: ch.title || `Chapter ${ch.chapterNumber}`,
                subtitle: ch.pages ? `${ch.pages} Pages` : undefined,
              }))
            );
          }
        } else {
          const liveNovels = await fetchMediaNovelChapters(selectedMedia);
          if (!isCancelled) {
            setItems(
              liveNovels.map((ch) => ({
                id: ch.id,
                number: ch.chapterNumber,
                title: ch.title || `Chapter ${ch.chapterNumber}`,
                subtitle: ch.volume ? `Volume ${ch.volume}` : 'Light Novel',
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load items in search modal:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    if (showEpisodeSearch) {
      loadItems();
    }

    return () => {
      isCancelled = true;
    };
  }, [showEpisodeSearch, selectedMedia?.id, selectedMedia?.category]);

  if (!showEpisodeSearch || !selectedMedia) return null;

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.number).includes(searchQuery) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelect = (num: number) => {
    setShowEpisodeSearch(false);
    if (selectedMedia.category === 'anime') {
      setActiveVideoEpisode({ media: selectedMedia, episodeNumber: num });
    } else {
      setActiveReader({ media: selectedMedia, chapterNumber: num });
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black overflow-y-auto no-scrollbar pb-24 text-white animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 p-4 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={() => setShowEpisodeSearch(false)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder={
              selectedMedia.category === 'anime'
                ? 'Search episode number or title...'
                : selectedMedia.category === 'manga'
                ? 'Search chapter number...'
                : 'Search novel volume or chapter...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-4 py-2 bg-white/10 rounded-full text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-purple-400 border border-white/10"
          />
        </div>

        {/* Source Dropdown Selector */}
        <div className="relative">
          <button
            onClick={() => setShowSourceDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-full text-xs font-semibold text-white/90 border border-white/10 hover:bg-white/20 cursor-pointer"
          >
            <span className="max-w-[100px] truncate">{selectedSource}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/60 shrink-0" />
          </button>

          {showSourceDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#181822] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50">
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => {
                    setSelectedSource(src);
                    setShowSourceDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left hover:bg-purple-600/30 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="truncate">{src}</span>
                  {selectedSource === src && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Grid Results */}
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-white/50 font-medium">
            {isLoading
              ? 'Fetching live indices...'
              : `Found ${filteredItems.length} verified ${
                  selectedMedia.category === 'anime' ? 'episodes' : 'chapters'
                }`}
          </p>
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-white/50">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <p className="text-xs">Loading live metadata...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-white/50 bg-[#121218] rounded-2xl border border-white/5 p-6">
            No matching items found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.number)}
                className="flex items-center justify-between p-3 bg-[#13131B] rounded-2xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-600/10 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedMedia.category === 'anime' ? (
                    <Play className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 block truncate">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[10px] text-white/40 block">{item.subtitle}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0 font-mono">
                  #{item.number}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
