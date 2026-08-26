import React, { useState } from 'react';
import {
  User,
  Heart,
  BookOpen,
  Bookmark,
  CheckCheck,
  Trash2,
  Tv,
  ChevronRight,
  ArrowLeft,
  Search,
  Plus,
  X,
  UserCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LibraryStatus, MediaCategory, MediaItem, UserLibraryEntry } from '../../types';
import { PosterImage } from '../common/PosterImage';
import { safeGetItem, safeSetItem } from '../../utils/storage';

export const ProfileView: React.FC = () => {
  const {
    userLibrary,
    userFavorites,
    recentActivity,
    openMediaDetails,
    activeLibraryStatus,
    setActiveLibraryStatus,
    removeFromLibrary,
    updateLibraryProgress,
    isMediaFavorite,
    toggleFavorite,
    showToast,
  } = useApp();

  // Search filter inside status subpage
  const [subpageSearch, setSubpageSearch] = useState('');

  // Edit Profile modal state with LocalStorage persistence
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileName, setProfileName] = useState(() => {
    return safeGetItem('satori_profile_name', 'MD');
  });
  const [profileSource, setProfileSource] = useState(() => {
    return safeGetItem('satori_profile_source', 'Google library');
  });
  const [profileLevel, setProfileLevel] = useState(() => {
    return safeGetItem('satori_profile_level', '2');
  });

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    safeSetItem('satori_profile_name', profileName, false);
    safeSetItem('satori_profile_source', profileSource, false);
    safeSetItem('satori_profile_level', profileLevel, false);
    setShowEditProfile(false);
    showToast('Profile updated successfully');
  };

  const getMediaForEntry = (
    mediaId: string | number,
    fallbackTitle: string,
    fallbackCover: string,
    category?: MediaCategory
  ): MediaItem => {
    return {
      id: String(mediaId),
      title: fallbackTitle,
      coverImage: fallbackCover,
      category: category || 'anime',
      format: category === 'manga' ? 'Manga' : category === 'novel' ? 'Light Novel' : 'TV',
      status: 'Releasing',
      score: 8.5,
      year: 2026,
      genres: ['Action', 'Adventure'],
      description: 'Media in your personal library collection.',
    };
  };

  // Status counts (Favorites strictly derived from userFavorites)
  const favoritesCount = userFavorites.length;
  const watchingCount = userLibrary.filter((i) => i.status === 'Watching').length;
  const readingCount = userLibrary.filter((i) => i.status === 'Reading').length;
  const planningCount = userLibrary.filter((i) => i.status === 'Planning').length;
  const completedCount = userLibrary.filter((i) => i.status === 'Completed').length;
  const droppedCount = userLibrary.filter((i) => i.status === 'Dropped').length;

  // Active watching items (up to 4 for 2x2 collage)
  const activeWatchingEntries = userLibrary.filter((i) => i.status === 'Watching');
  const watchingGridItems = activeWatchingEntries.slice(0, 4);

  // Active reading items (up to 4 for 2x2 collage)
  const activeReadingEntries = userLibrary.filter((i) => i.status === 'Reading');
  const readingGridItems = activeReadingEntries.slice(0, 4);

  // Status capsules definitions matching the reference video & screenshot
  const statusCapsules = [
    {
      status: 'Favorites' as const,
      label: `${favoritesCount} Favorites`,
      icon: <Heart className="w-3.5 h-3.5 fill-[#f43f5e] text-[#f43f5e]" />,
      pillClass: 'border-pink-500/40 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    },
    {
      status: 'Watching' as const,
      label: `${watchingCount} Watching`,
      icon: <Tv className="w-3.5 h-3.5 text-emerald-400" />,
      pillClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]',
    },
    {
      status: 'Reading' as const,
      label: `${readingCount} Reading`,
      icon: <BookOpen className="w-3.5 h-3.5 text-white" />,
      pillClass: 'border-white/30 bg-white/10 text-white hover:bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]',
    },
    {
      status: 'Planning' as const,
      label: `${planningCount} Planning`,
      icon: <Bookmark className="w-3.5 h-3.5 text-amber-400" />,
      pillClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(251,191,36,0.15)]',
    },
    {
      status: 'Completed' as const,
      label: `${completedCount} Completed`,
      icon: <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />,
      pillClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_12px_rgba(56,189,248,0.15)]',
    },
    {
      status: 'Dropped' as const,
      label: `${droppedCount} Dropped`,
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
      pillClass: 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
    },
  ];

  // Filter items for subpage view
  const filteredFavorites = userFavorites.filter((i) =>
    i.title.toLowerCase().includes(subpageSearch.toLowerCase())
  );

  const filteredLibraryItems = userLibrary
    .filter((i) => i.status === activeLibraryStatus)
    .filter((i) => i.title.toLowerCase().includes(subpageSearch.toLowerCase()));

  return (
    <div className="w-full min-h-screen bg-black text-white pb-32 select-none">
      {/* If subpage is active, render category subview */}
      {activeLibraryStatus ? (
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
          {/* Subpage Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveLibraryStatus(null);
                  setSubpageSearch('');
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                  {activeLibraryStatus}
                </h1>
                <p className="text-xs text-white/50">
                  {activeLibraryStatus === 'Favorites'
                    ? `${filteredFavorites.length} favorite titles in your profile`
                    : `${filteredLibraryItems.length} items in your collection`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={subpageSearch}
              onChange={(e) => setSubpageSearch(e.target.value)}
              placeholder={`Search in ${activeLibraryStatus}...`}
              className="w-full bg-[#12141C] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* List items */}
          <div className="space-y-3 pt-1">
            {activeLibraryStatus === 'Favorites' ? (
              filteredFavorites.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Heart className="w-8 h-8 text-rose-500/40 mx-auto" />
                  <p className="text-sm font-semibold text-white/60">No favorites added yet</p>
                  <p className="text-xs text-white/40">
                    Tap the Heart icon on any title details page to save it to your Favorites.
                  </p>
                </div>
              ) : (
                filteredFavorites.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openMediaDetails(item)}
                    className="flex items-center gap-3.5 p-3 bg-[#11131A] rounded-2xl border border-white/10 hover:border-pink-500/40 transition-all cursor-pointer shadow-lg group"
                  >
                    <PosterImage
                      src={item.coverImage}
                      alt={item.title}
                      className="w-14 h-20 rounded-xl shadow-md shrink-0"
                      imgClassName="group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-pink-300 transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-white/60">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-white/10 font-bold text-[10px] text-white/80">
                          {item.category}
                        </span>
                        {item.score && (
                          <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{item.score}</span>
                          </div>
                        )}
                        {item.year && <span className="text-[10px] text-white/40">{item.year}</span>}
                      </div>
                      <p className="text-[10px] text-white/40 mt-1 capitalize">
                        {item.format || 'Media'} · {item.status || 'Active'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleFavorite(item)}
                        className="p-2.5 rounded-full transition-colors cursor-pointer text-rose-500 bg-rose-500/10 hover:bg-rose-500/20"
                        title="Remove from favorites"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              filteredLibraryItems.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <p className="text-sm font-semibold text-white/60">No items found in {activeLibraryStatus}</p>
                  <p className="text-xs text-white/40">Explore media from the Home tab and add them to your library.</p>
                </div>
              ) : (
                filteredLibraryItems.map((entry) => {
                  const fullMedia = getMediaForEntry(entry.mediaId, entry.title, entry.coverImage, entry.category);
                  const isFav = isMediaFavorite(entry.mediaId);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => openMediaDetails(fullMedia)}
                      className="flex items-center gap-3.5 p-3 bg-[#11131A] rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer shadow-lg group"
                    >
                      <PosterImage
                        src={entry.coverImage}
                        alt={entry.title}
                        className="w-14 h-20 rounded-xl shadow-md shrink-0"
                        imgClassName="group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-white/60">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-white/10 font-bold text-[10px] text-white/80">
                            {entry.category}
                          </span>
                          <span>
                            {entry.category === 'anime' ? 'Ep' : 'Ch'} {entry.currentProgress} / {entry.totalCount}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1">Updated {entry.lastUpdated}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(fullMedia)}
                          className={`p-2 rounded-full transition-colors cursor-pointer ${
                            isFav ? 'text-rose-500 bg-rose-500/10' : 'text-white/40 hover:text-white bg-white/5'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => removeFromLibrary(entry.mediaId)}
                          className="p-2 rounded-full text-white/40 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 1. USER HEADER SECTION WITH ARTWORK BACKDROP */}
          <div className="relative w-full h-[320px] sm:h-[360px] overflow-hidden">
            {/* Backdrop Artwork */}
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80"
                alt="Profile Backdrop"
                className="w-full h-full object-cover object-center opacity-85"
              />
              {/* Dark Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 via-40% to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
            </div>

            {/* Top-Left Level Indicator Badge */}
            <div className="absolute top-6 left-6 z-10 flex flex-col items-start select-none">
              <span className="text-4xl sm:text-5xl font-black text-white leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] tracking-tight">
                {profileLevel}
              </span>
              <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-[0.2em] leading-none mt-1 drop-shadow-md">
                LEVEL
              </span>
            </div>

            {/* User Identity Row & Edit Profile Button */}
            <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3.5">
                {/* Circular Avatar Badge (MD) */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#0091FF] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-[0_0_25px_rgba(0,145,255,0.4)] border-2 border-white/20 shrink-0">
                  {profileName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                    {profileName}
                  </h1>
                  <span className="text-xs sm:text-[13px] text-white/70 font-medium drop-shadow-sm mt-0.5">
                    {profileSource}
                  </span>
                </div>
              </div>

              {/* Top-Right Profile Edit Icon Button */}
              <button
                onClick={() => setShowEditProfile(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#181a22]/80 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white cursor-pointer shadow-lg transition-all"
                aria-label="Edit Profile"
              >
                <UserCheck className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. HORIZONTAL SLIDING CATEGORY CAPSULES */}
          <div className="w-full mt-2">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-4 scroll-smooth touch-pan-x">
              {statusCapsules.map((capsule) => (
                <button
                  key={capsule.status}
                  onClick={() => setActiveLibraryStatus(capsule.status)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-[13px] font-bold tracking-tight whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${capsule.pillClass}`}
                >
                  {capsule.icon}
                  <span>{capsule.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. WATCHING & READING ACTIVE CONTAINER BOXES */}
          <div className="grid grid-cols-2 gap-3 px-4 mt-4">
            {/* Watching Container */}
            <div className="space-y-2">
              <div
                onClick={() => setActiveLibraryStatus('Watching')}
                className="flex items-center gap-1 cursor-pointer font-bold text-[15px] sm:text-base text-white group"
              >
                <span className="group-hover:text-emerald-400 transition-colors">Watching</span>
                <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="bg-[#0e1017] rounded-2xl p-1.5 border border-white/10 shadow-lg">
                <div className="grid grid-cols-2 gap-1.5">
                  {watchingGridItems.length > 0 ? (
                    watchingGridItems.map((entry) => {
                      const media = getMediaForEntry(entry.mediaId, entry.title, entry.coverImage, entry.category);
                      return (
                        <div
                          key={entry.id}
                          onClick={() => openMediaDetails(media)}
                          className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform duration-150 bg-[#1e232a] shadow-sm relative group"
                        >
                          <PosterImage
                            src={entry.coverImage}
                            alt={entry.title}
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 py-10 text-center text-xs text-white/40 font-medium">
                      No active watching items
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reading Container */}
            <div className="space-y-2">
              <div
                onClick={() => setActiveLibraryStatus('Reading')}
                className="flex items-center gap-1 cursor-pointer font-bold text-[15px] sm:text-base text-white group"
              >
                <span className="group-hover:text-cyan-400 transition-colors">Reading</span>
                <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="bg-[#0e1017] rounded-2xl p-1.5 border border-white/10 shadow-lg">
                <div className="grid grid-cols-2 gap-1.5">
                  {readingGridItems.length > 0 ? (
                    readingGridItems.map((entry) => {
                      const media = getMediaForEntry(entry.mediaId, entry.title, entry.coverImage, entry.category);
                      return (
                        <div
                          key={entry.id}
                          onClick={() => openMediaDetails(media)}
                          className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform duration-150 bg-[#1e232a] shadow-sm relative group"
                        >
                          <PosterImage
                            src={entry.coverImage}
                            alt={entry.title}
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 py-10 text-center text-xs text-white/40 font-medium">
                      No active reading items
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. RECENT ACTIVITY FEED */}
          <div className="space-y-3 px-4 mt-6">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Recent Activity
            </h2>

            <div className="space-y-2.5">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40 bg-[#0e1118]/60 border border-white/5 rounded-2xl">
                  No recent activity logged yet.
                </div>
              ) : (
                recentActivity.map((act) => {
                  const media = getMediaForEntry(act.mediaId, act.title, act.coverImage);
                  const isWatching = act.type === 'WATCHING';
                  const isReading = act.type === 'READING';
                  const isCompleted = act.type === 'COMPLETED';

                  return (
                    <div
                      key={act.id}
                      onClick={() => openMediaDetails(media)}
                      className="flex items-center gap-3.5 p-3 bg-[#0e1118]/90 hover:bg-[#141822] border border-white/10 rounded-2xl transition-all duration-150 cursor-pointer shadow-md group"
                    >
                      {/* Thumbnail Poster */}
                      <PosterImage
                        src={act.coverImage}
                        alt={act.title}
                        className="w-12 h-14 rounded-xl shrink-0 shadow-sm"
                        imgClassName="group-hover:scale-105 transition-transform"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isWatching && (
                            <span className="text-[#4ade80] font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                              WATCHING
                            </span>
                          )}
                          {isReading && (
                            <span className="text-white font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                              READING
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[#38bdf8] font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                              COMPLETED
                            </span>
                          )}
                          {!isWatching && !isReading && !isCompleted && (
                            <span className="text-[#f43f5e] font-extrabold text-[11px] uppercase tracking-wider shrink-0">
                              {act.type}
                            </span>
                          )}

                          <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                            {act.title}
                          </h3>
                        </div>

                        <p className="text-xs text-white/50 font-medium mt-1">
                          {act.timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#12141C] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Edit Profile</span>
              </h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Library Source / Title</label>
                <input
                  type="text"
                  value={profileSource}
                  onChange={(e) => setProfileSource(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Level Number</label>
                <input
                  type="number"
                  value={profileLevel}
                  onChange={(e) => setProfileLevel(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  min="1"
                  max="99"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0091FF] hover:bg-[#007fe0] font-bold text-sm text-white rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
