import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Heart,
  Bell,
  Share2,
  Download,
  Search,
  Music,
  ListOrdered,
  Edit3,
  ChevronDown,
  ChevronUp,
  Play,
  BookOpen,
  Check,
} from 'lucide-react';
import { useApp, ACCENT_COLOR_MAP } from '../../context/AppContext';
import { MediaItem, Character, EpisodeItem } from '../../types';
import { getRatingDisplay } from '../../utils/rating';
import { PosterImage } from '../common/PosterImage';

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
    toggleFavorite,
    getLibraryEntry,
    showToast,
    settings,
  } = useApp();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(true);

  if (!selectedMedia) return null;

  const accent = ACCENT_COLOR_MAP[settings.accentColor] || ACCENT_COLOR_MAP.Purple;
  const libraryEntry = getLibraryEntry(selectedMedia.id);
  const isFavorite = libraryEntry?.isFavorite;

  // Pagination for chapters / episodes (e.g. 1-50, 51-100...)
  const totalCount =
    selectedMedia.totalEpisodes || selectedMedia.totalChapters || selectedMedia.totalVolumes || 12;

  const rangeSize = 50;
  const rangeCount = Math.ceil(totalCount / rangeSize);
  const ranges: string[] = [];
  for (let i = 0; i < rangeCount; i++) {
    const start = i * rangeSize + 1;
    const end = Math.min((i + 1) * rangeSize, totalCount);
    ranges.push(`${start}–${end}`);
  }

  const currentRangeStart = selectedRangeIndex * rangeSize + 1;
  const currentRangeEnd = Math.min((selectedRangeIndex + 1) * rangeSize, totalCount);
  const itemsInCurrentRange = Array.from(
    { length: currentRangeEnd - currentRangeStart + 1 },
    (_, i) => currentRangeStart + i
  );

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Link copied to clipboard');
  };

  const handleToggleAlerts = () => {
    const next = !isAlertsEnabled;
    setIsAlertsEnabled(next);
    showToast(next ? 'Airing alerts enabled' : 'Airing alerts disabled');
  };

  const handleItemClick = (num: number) => {
    if (selectedMedia.category === 'anime') {
      setActiveVideoEpisode({ media: selectedMedia, episodeNumber: num });
    } else {
      setActiveReader({ media: selectedMedia, chapterNumber: num });
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black overflow-y-auto no-scrollbar pb-32 text-white animate-in fade-in duration-200">
      {/* Top Floating Back Button & Time status */}
      <div className="fixed top-3 left-3 z-50">
        <button
          onClick={closeMediaDetails}
          className="p-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-xl hover:bg-white/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 1. HERO BACKDROP POSTER */}
      <div className="relative w-full h-[400px] sm:h-[480px] overflow-hidden">
        <img
          src={selectedMedia.bannerImage || selectedMedia.coverImage}
          alt={selectedMedia.title}
          className="w-full h-full object-cover object-top"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black" />

        {/* Backdrop Timer/Status pill if shown in screenshot */}
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-mono font-bold text-white/80 border border-white/10">
          05 : 00 : 17
        </div>
      </div>

      {/* 2. MEDIA METADATA HEADER */}
      <div className="relative -mt-24 px-4 space-y-4">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {selectedMedia.title}
        </h1>

        {/* Badges & Meta Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
          {/* Rating */}
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-white font-extrabold">{getRatingDisplay(selectedMedia)}</span>
          </div>

          {/* Studio / Author Pill */}
          {(selectedMedia.studio || selectedMedia.author) && (
            <div className="px-2.5 py-0.5 rounded-full border border-white/20 text-white font-semibold text-[11px]">
              {selectedMedia.studio || selectedMedia.author}
            </div>
          )}

          {/* Age Rating & Status */}
          {selectedMedia.ageRating && <span>{selectedMedia.ageRating} ·</span>}
          <span>{selectedMedia.status}</span>
          <span>·</span>
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[11px] font-bold">
            {selectedMedia.year}
          </span>

          {/* Heart Count Toggle */}
          <button
            onClick={() => toggleFavorite(selectedMedia)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-purple-400 text-purple-400' : 'text-white'}`} />
            <span className="font-bold">{selectedMedia.communityHearts || 339}</span>
          </button>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1.5">
          {selectedMedia.genres.map((g) => (
            <span
              key={g}
              className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold border border-white/5"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Action Buttons: Add to Library, Alert Bell, Share */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowAddToLibrary(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer ${
              libraryEntry
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
            }`}
          >
            {libraryEntry ? (
              <>
                <Check className="w-4 h-4" />
                <span>{libraryEntry.status}</span>
              </>
            ) : (
              <>
                <span>+</span>
                <span>Add to Library</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleAlerts}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer"
          >
            <Bell className={`w-5 h-5 ${isAlertsEnabled ? 'text-purple-400' : 'text-white/60'}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* 3. EPISODES / CHAPTERS / VOLUMES SECTION */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              {selectedMedia.category === 'anime'
                ? `Episodes (${selectedMedia.totalEpisodes || selectedMedia.latestEpisode || 2})`
                : selectedMedia.category === 'manga'
                ? `Chapters (${selectedMedia.totalChapters || 232})`
                : `Volumes (${selectedMedia.totalVolumes || 28})`}
            </h2>

            <div className="flex items-center gap-3 text-white/80">
              <button
                onClick={() => showToast('Starting offline download...')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowEpisodeSearch(true)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Range tabs (e.g. 1-50, 51-100) */}
          {ranges.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {ranges.map((rangeStr, idx) => {
                const isActive = selectedRangeIndex === idx;
                return (
                  <button
                    key={rangeStr}
                    onClick={() => setSelectedRangeIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    {rangeStr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Episode / Chapter Grid or Volume List */}
          {selectedMedia.category === 'novel' ? (
            /* Novel Volumes List */
            <div className="space-y-2.5">
              {Array.from({ length: Math.min(selectedMedia.totalVolumes || 4, 10) }, (_, i) => i + 1).map(
                (volNum) => (
                  <div
                    key={volNum}
                    onClick={() => handleItemClick(volNum)}
                    className="flex items-center gap-3 p-2.5 bg-[#121218] rounded-2xl border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer"
                  >
                    <PosterImage
                      src={selectedMedia.coverImage}
                      alt={`Volume ${volNum}`}
                      className="w-12 h-16 rounded-xl shadow-md flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">Volume {volNum}</h4>
                      <p className="text-xs text-white/50">Complete LN Edition</p>
                    </div>
                    <BookOpen className="w-5 h-5 text-purple-400 mr-2" />
                  </div>
                )
              )}
            </div>
          ) : (
            /* Numbered Grid buttons */
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {itemsInCurrentRange.map((num) => (
                <button
                  key={num}
                  onClick={() => handleItemClick(num)}
                  className="aspect-square flex items-center justify-center rounded-2xl bg-[#14141B] border border-white/5 text-sm font-bold text-white hover:bg-purple-600 hover:border-purple-500 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible toggle arrow */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            className="p-1 text-white/60 hover:text-white"
          >
            {isDescriptionExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* 4. DESCRIPTION & SYNOPSIS */}
        {isDescriptionExpanded && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            <h2 className="text-sm font-bold text-white tracking-wide">Description</h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {selectedMedia.description}
            </p>
            {selectedMedia.sourceNote && (
              <p className="text-xs text-white/40 italic">{selectedMedia.sourceNote}</p>
            )}
          </div>
        )}

        {/* 5. FRANCHISE NAVIGATION BUTTONS: PREQUEL / SEQUEL / THEMES / WATCH ORDER */}
        <div className="pt-3 space-y-2.5">
          {/* Prequel / Sequel badges */}
          {(selectedMedia.hasPrequel || selectedMedia.hasSequel) && (
            <div className="flex gap-2">
              {selectedMedia.hasPrequel && (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-purple-900/60 border border-blue-500/30 text-center font-black text-xs tracking-wider uppercase text-blue-200">
                  PREQUEL
                </div>
              )}
              {selectedMedia.hasSequel && (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-900/60 to-emerald-900/60 border border-emerald-500/30 text-center font-black text-xs tracking-wider uppercase text-emerald-200">
                  SEQUEL
                </div>
              )}
            </div>
          )}

          {/* Themes & Watch Order buttons */}
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

        {/* 6. REVIEWS */}
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

          {/* Reviews Carousel */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {(selectedMedia.reviews || [
              {
                id: 'rev-default',
                authorName: 'AnimeFanatic',
                authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                score: '9.5/10',
                helpfulCount: 320,
                totalVotes: 340,
                headline: 'An absolute masterpiece of animation and emotion.',
                content: 'Everything about this series hits right, from the pacing to the visual fidelity.',
              },
            ]).map((rev) => (
              <div
                key={rev.id}
                className="min-w-[280px] max-w-[320px] p-3.5 bg-[#14141C] rounded-2xl border border-white/10 space-y-2 shrink-0 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={rev.authorAvatar}
                      alt={rev.authorName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
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

        {/* 7. CHARACTERS */}
        {selectedMedia.characters && selectedMedia.characters.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Characters</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {selectedMedia.characters.map((char) => (
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

        {/* 8. VOICE ACTORS */}
        {selectedMedia.voiceActors && selectedMedia.voiceActors.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Voice Actors</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {selectedMedia.voiceActors.map((va) => (
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

        {/* 9. RELATIONS */}
        {selectedMedia.relations && selectedMedia.relations.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Relations</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {selectedMedia.relations.map((rel) => (
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

        {/* 10. RECOMMENDATIONS */}
        {selectedMedia.recommendations && selectedMedia.recommendations.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Recommendations</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {selectedMedia.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() =>
                    openMediaDetails({
                      id: rec.id,
                      title: rec.title,
                      coverImage: rec.coverImage,
                      category: rec.category || selectedMedia.category,
                      format: (rec.format as any) || selectedMedia.format,
                      status: 'Releasing',
                      score: rec.score,
                      year: 2026,
                      genres: selectedMedia.genres,
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
