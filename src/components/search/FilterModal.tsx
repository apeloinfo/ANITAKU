import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useApp, DEFAULT_FILTERS } from '../../context/AppContext';
import { FilterOptions } from '../../types';

export const FilterModal: React.FC = () => {
  const { filters, setFilters, showFilterModal, setShowFilterModal } = useApp();
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [advancedTagsOpen, setAdvancedTagsOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Sync draft state whenever the modal opens
  useEffect(() => {
    if (showFilterModal) {
      setLocalFilters(filters);
      setTagSearchQuery('');
      setAdvancedTagsOpen(false);
    }
  }, [showFilterModal, filters]);

  if (!showFilterModal) return null;

  const genresList = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Ecchi',
    'Horror',
    'Fantasy',
    'Mahou Shoujo',
    'Mecha',
    'Music',
    'Mystery',
    'Psychological',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Sports',
    'Supernatural',
    'Thriller',
    'Harem',
    'Reverse Harem',
    "Girls' Love",
    "Boys' Love",
    'Gourmet',
    'Isekai',
    'School',
    'Military',
    'Vampire',
    'Shounen',
    'Shoujo',
    'Seinen',
    'Josei',
    'Kids',
  ];

  const formatList = ['TV', 'Movie', 'ONA', 'OVA', 'Special'];
  const statusList = ['Releasing', 'Finished', 'Upcoming'];
  const libraryOptions = ['Any', 'In Library', 'Not In Library'] as const;
  const minScoreOptions = ['Any', '6+', '7+', '8+', '9+'] as const;
  const yearChips = ['Any', '2028', '2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020'];
  const seasonOptions = ['Any', 'Winter', 'Spring', 'Summer', 'Fall'];
  const tagCategoryOptions: ('Theme' | 'Demographic' | 'Setting' | 'Cast' | 'Technical')[] = [
    'Theme',
    'Demographic',
    'Setting',
    'Cast',
    'Technical',
  ];

  const advancedTagGroups = {
    Cast: [
      'Female Protagonist',
      'Male Protagonist',
      'Ensemble Cast',
      'Anti-Hero',
      'Villainess',
      'Primarily Female Cast',
      'Primarily Male Cast',
      'Chibi',
      'Kemonomimi',
    ],
    Setting: [
      'Work',
      'College',
      'Urban',
      'Rural',
      'Historical',
      'Space',
      'Post-Apocalyptic',
      'Cyberpunk',
      'Dystopian',
      'Kingdom Management',
    ],
    Story: [
      'Coming of Age',
      'Tragedy',
      'Revenge',
      'Survival',
      'Politics',
      'War',
      'Time Manipulation',
      'Travel',
      'Detective',
      'Mystery',
      'Conspiracy',
    ],
    Action: [
      'Magic',
      'Super Power',
      'Martial Arts',
      'Swordplay',
      'Guns',
      'Tanks',
      'Archery',
      'Espionage',
      'Assassins',
      'Battle Royale',
    ],
    Tone: [
      'Iyashikei',
      'Cute Girls Doing Cute Things',
      'Parody',
      'Satire',
      'Philosophy',
      'Psychosexual',
      'Denpa',
      'Noir',
      'Slapstick',
    ],
    Culture: [
      'Video Games',
      'Idol',
      'Music',
      'Mythology',
      'Youkai',
      'Samurai',
      'Ninja',
      'Otaku Culture',
      'Fashion',
      'Photography',
    ],
  };

  const toggleGenre = (genre: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const toggleFormat = (fmt: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      format: prev.format.includes(fmt)
        ? prev.format.filter((f) => f !== fmt)
        : [...prev.format, fmt],
    }));
  };

  const toggleStatus = (st: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status.includes(st)
        ? prev.status.filter((s) => s !== st)
        : [...prev.status, st],
    }));
  };

  const handleLibraryChange = (lib: 'Any' | 'In Library' | 'Not In Library') => {
    setLocalFilters((prev) => ({ ...prev, libraryState: lib }));
  };

  const handleMinScoreChange = (score: 'Any' | '6+' | '7+' | '8+' | '9+') => {
    setLocalFilters((prev) => ({ ...prev, minScore: score }));
  };

  const handleYearChip = (year: string) => {
    setLocalFilters((prev) => ({ ...prev, selectedYear: year }));
  };

  const toggleSeason = (season: string) => {
    if (season === 'Any') {
      setLocalFilters((prev) => ({ ...prev, season: [] }));
      return;
    }
    setLocalFilters((prev) => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter((s) => s !== season)
        : [...prev.season, season],
    }));
  };

  const toggleAdvancedTag = (tag: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      advancedTags: prev.advancedTags.includes(tag)
        ? prev.advancedTags.filter((t) => t !== tag)
        : [...prev.advancedTags, tag],
    }));
  };

  const handleReset = () => {
    const resetState = {
      ...DEFAULT_FILTERS,
      category: filters.category,
      query: filters.query,
    };
    setLocalFilters(resetState);
    setFilters(resetState);
    setShowFilterModal(false);
  };

  const handleApply = () => {
    setFilters(localFilters);
    setShowFilterModal(false);
  };

  const handleClose = () => {
    setShowFilterModal(false);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-[#0A0A0E] overflow-y-auto no-scrollbar text-white animate-in fade-in duration-200 select-none flex flex-col justify-between">
      {/* 1. SCROLLABLE TOP HEADER (Scrolls naturally with content, no divider border) */}
      <div className="w-full px-4 pt-4 pb-3 max-w-xl mx-auto flex items-center">
        <button
          onClick={handleClose}
          className="p-2 -ml-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer mr-3"
          aria-label="Back to Search"
        >
          <ArrowLeft className="w-6 h-6 text-[#c084fc]" />
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight">Filters</h2>
      </div>

      {/* 2. FILTER SECTIONS CONTAINER */}
      <div className="px-4 py-4 max-w-xl mx-auto w-full space-y-6 flex-1 pb-10">
        {/* GENRES */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {genresList.map((genre) => {
              const isSelected = localFilters.genres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </div>

        {/* FORMAT */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Format</h3>
          <div className="flex flex-wrap gap-2">
            {formatList.map((fmt) => {
              const isSelected = localFilters.format.includes(fmt);
              return (
                <button
                  key={fmt}
                  onClick={() => toggleFormat(fmt)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>

        {/* STATUS */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Status</h3>
          <div className="flex flex-wrap gap-2">
            {statusList.map((st) => {
              const isSelected = localFilters.status.includes(st);
              return (
                <button
                  key={st}
                  onClick={() => toggleStatus(st)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* LIBRARY */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Library</h3>
          <div className="flex flex-wrap gap-2">
            {libraryOptions.map((lib) => {
              const isSelected = localFilters.libraryState === lib;
              return (
                <button
                  key={lib}
                  onClick={() => handleLibraryChange(lib)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {lib}
                </button>
              );
            })}
          </div>
        </div>

        {/* MINIMUM SCORE */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Minimum score</h3>
          <div className="flex flex-wrap gap-2">
            {minScoreOptions.map((score) => {
              const isSelected = localFilters.minScore === score;
              return (
                <button
                  key={score}
                  onClick={() => handleMinScoreChange(score)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {score}
                </button>
              );
            })}
          </div>
        </div>

        {/* SCORE RANGE */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400">Score range</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 font-medium">
            {localFilters.scoreRange[0]} - {localFilters.scoreRange[1]}
          </p>
          <div className="relative py-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={localFilters.scoreRange[0]}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  scoreRange: [Number(e.target.value), 100],
                }))
              }
              className="w-full h-2 bg-[#1A1B23] rounded-lg appearance-none cursor-pointer accent-[#a855f7]"
            />
          </div>
        </div>

        {/* YEAR */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Year</h3>
          <div className="flex flex-wrap gap-2">
            {yearChips.map((year) => {
              const isSelected = localFilters.selectedYear === year;
              return (
                <button
                  key={year}
                  onClick={() => handleYearChip(year)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        {/* YEAR RANGE */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400">Year range</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 font-medium">
            {localFilters.yearRange[0]} - {localFilters.yearRange[1]}
          </p>
          <div className="relative py-2">
            <input
              type="range"
              min={1940}
              max={2028}
              step={1}
              value={localFilters.yearRange[0]}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  yearRange: [Number(e.target.value), 2028],
                }))
              }
              className="w-full h-2 bg-[#1A1B23] rounded-lg appearance-none cursor-pointer accent-[#a855f7]"
            />
          </div>
        </div>

        {/* SEASON */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Season</h3>
          <div className="flex flex-wrap gap-2">
            {seasonOptions.map((season) => {
              const isSelected =
                season === 'Any'
                  ? localFilters.season.length === 0
                  : localFilters.season.includes(season);

              return (
                <button
                  key={season}
                  onClick={() => toggleSeason(season)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {season}
                </button>
              );
            })}
          </div>
        </div>

        {/* STUDIO */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Studio</h3>
          <input
            type="text"
            placeholder="Studio name"
            value={localFilters.studio || ''}
            onChange={(e) =>
              setLocalFilters((prev) => ({ ...prev, studio: e.target.value }))
            }
            className="w-full bg-[#1E1F28] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#a855f7] transition-colors"
          />
        </div>

        {/* TAG CATEGORIES */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-2.5">Tag categories</h3>
          <div className="flex flex-wrap gap-2">
            {tagCategoryOptions.map((cat) => {
              const isSelected = localFilters.tagCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, tagCategory: cat }))
                  }
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                      : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ADVANCED TAGS DROPDOWN */}
        <div className="space-y-4">
          <button
            onClick={() => setAdvancedTagsOpen(!advancedTagsOpen)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-[#1A1B23] border border-white/10 text-sm font-semibold text-white cursor-pointer hover:bg-[#22232E] transition-colors"
          >
            <span>Advanced Tags</span>
            {advancedTagsOpen ? (
              <ChevronUp className="w-4 h-4 text-[#c084fc]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#c084fc]" />
            )}
          </button>

          {advancedTagsOpen && (
            <div className="space-y-5 pt-1 animate-in fade-in duration-150">
              {/* Search Tags Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tags"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full bg-[#1E1F28] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#a855f7] transition-colors"
                />
                {tagSearchQuery && (
                  <button
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tag Groups */}
              {Object.entries(advancedTagGroups).map(([groupName, tags]) => {
                const filteredTags = tagSearchQuery
                  ? tags.filter((t) =>
                      t.toLowerCase().includes(tagSearchQuery.toLowerCase())
                    )
                  : tags;

                if (filteredTags.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-400">{groupName}</h4>
                    <div className="flex flex-wrap gap-2">
                      {filteredTags.map((tag) => {
                        const isSelected = localFilters.advancedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleAdvancedTag(tag)}
                            className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'bg-[#a855f7] text-white border border-[#c084fc] shadow-none'
                                : 'border border-white/10 bg-[#1A1B23] text-gray-300 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM STICKY ACTION BAR */}
      <div className="sticky bottom-0 z-50 px-4 py-4 bg-[#0A0A0E]/95 backdrop-blur-xl">
        <div className="max-w-xl mx-auto w-full flex items-center justify-between gap-3 sm:gap-4 px-1">
          <button
            onClick={handleReset}
            className="ml-6 sm:ml-10 w-[40%] sm:w-[35%] max-w-[180px] py-4 sm:py-[18px] text-purple-400 hover:text-purple-300 text-sm sm:text-base font-bold transition-colors cursor-pointer select-none active:scale-[0.98] text-center bg-transparent border-0"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="w-[52%] sm:w-[46%] max-w-[220px] bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm sm:text-base font-bold py-4 sm:py-[18px] rounded-full transition-all border border-purple-400/20 text-center cursor-pointer active:scale-[0.98] shadow-sm shadow-purple-900/30"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

