import React, { useState } from 'react';
import { ArrowLeft, Search, Check, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EpisodeSearchModal: React.FC = () => {
  const {
    selectedMedia,
    showEpisodeSearch,
    setShowEpisodeSearch,
    setActiveVideoEpisode,
    setActiveReader,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('Default');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  if (!showEpisodeSearch || !selectedMedia) return null;

  const sources = ['Default', 'Source 1 (Sub)', 'Source 2 (Dub)', 'Zone Fast', 'HLS Multi'];
  const totalCount =
    selectedMedia.totalEpisodes || selectedMedia.totalChapters || selectedMedia.totalVolumes || 24;

  const allItems = Array.from({ length: totalCount }, (_, i) => ({
    number: i + 1,
    title:
      selectedMedia.category === 'anime'
        ? `Episode ${i + 1}`
        : selectedMedia.category === 'manga'
        ? `Chapter ${i + 1}`
        : `Volume ${i + 1}`,
  }));

  const filteredItems = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.number).includes(searchQuery)
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
                : 'Search chapter...'
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
            <span>{selectedSource}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/60" />
          </button>

          {showSourceDropdown && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-[#181822] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50">
              {sources.map((src) => (
                <button
                  key={src}
                  onClick={() => {
                    setSelectedSource(src);
                    setShowSourceDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-left hover:bg-purple-600/30 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{src}</span>
                  {selectedSource === src && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Grid Results */}
      <div className="p-4 max-w-2xl mx-auto space-y-2">
        <p className="text-xs text-white/50 px-1 font-medium">
          Found {filteredItems.length} {selectedMedia.category === 'anime' ? 'episodes' : 'chapters'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredItems.map((item) => (
            <button
              key={item.number}
              onClick={() => handleSelect(item.number)}
              className="flex items-center justify-between p-3 bg-[#13131B] rounded-2xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-600/10 transition-all text-left group cursor-pointer"
            >
              <span className="text-xs font-bold text-white group-hover:text-purple-300">
                {item.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                #{item.number}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
