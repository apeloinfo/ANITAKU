import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MediaCategory,
  NavTab,
  MediaItem,
  Character,
  LibraryStatus,
  UserLibraryEntry,
  RecentActivityItem,
  SettingsState,
  AccentColorKey,
  FilterOptions,
} from '../types';
import { INITIAL_USER_LIBRARY, INITIAL_RECENT_ACTIVITY } from '../services/api';

export const ACCENT_COLOR_MAP: Record<AccentColorKey, { hex: string; bg: string; text: string; ring: string; border: string; glow: string }> = {
  Purple: { hex: '#C084FC', bg: 'bg-purple-500', text: 'text-purple-400', ring: 'ring-purple-400', border: 'border-purple-500', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.5)]' },
  Blue: { hex: '#60A5FA', bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-400', border: 'border-blue-500', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.5)]' },
  Teal: { hex: '#2DD4BF', bg: 'bg-teal-500', text: 'text-teal-400', ring: 'ring-teal-400', border: 'border-teal-500', glow: 'shadow-[0_0_15px_rgba(45,212,191,0.5)]' },
  Emerald: { hex: '#34D399', bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-400', border: 'border-emerald-500', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]' },
  Amber: { hex: '#FBBF24', bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-400', border: 'border-amber-500', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]' },
  Coral: { hex: '#FB923C', bg: 'bg-orange-500', text: 'text-orange-400', ring: 'ring-orange-400', border: 'border-orange-500', glow: 'shadow-[0_0_15px_rgba(251,146,60,0.5)]' },
  Rose: { hex: '#FB7185', bg: 'bg-rose-500', text: 'text-rose-400', ring: 'ring-rose-400', border: 'border-rose-500', glow: 'shadow-[0_0_15px_rgba(251,113,133,0.5)]' },
  Red: { hex: '#F87171', bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-400', border: 'border-red-500', glow: 'shadow-[0_0_15px_rgba(248,113,113,0.5)]' },
  Lime: { hex: '#A3E635', bg: 'bg-lime-500', text: 'text-lime-400', ring: 'ring-lime-400', border: 'border-lime-500', glow: 'shadow-[0_0_15px_rgba(163,230,53,0.5)]' },
};

const DEFAULT_SETTINGS: SettingsState = {
  appLanguage: 'System Default',
  appHaptics: true,
  deviceNotifications: true,
  dns: 'Cloudflare',
  enableTrailers: false,
  trailersStartMuted: true,
  cacheLimit: 'Balanced',

  pureBlackMode: true,
  accentColor: 'Purple',
  glassBlur: 10,
  glassSaturation: 100,
  glassRefraction: 10,
  glassTint: 12,

  homepageMetadata: 'Auto',
  titleLanguage: 'English',
  showLibraryProgress: true,
  fillerList: true,

  gestures: true,
  ambientLight: false,
  autoSkipFiller: false,
  sleepTimer: 'Off',
  videoQuality: 'Auto',
  audioPreference: 'Japanese',
  subtitleLanguage: 'English',
  subtitlePreference: 'Automatic',
  subtitleFont: 'Netflix Sans',
  subtitleSize: 16,
  subtitleElevation: -10,
  playbackSpeed: '1x',

  mangaReaderMode: 'Webtoon',
  pageTurnAnimation: 'Default',
  pagedReaderDirection: 'Left to Right',
  imageScale: 'Fit',
  zoomStart: 'Auto',
  tapNavigation: 'Edges',
  readerBackground: 'Black',
  cropBorders: false,
  webtoonCropBorders: false,
  automaticWebtoon: true,
  widePageZoom: true,
  keepScreenOn: true,
  preloadPages: 8,

  downloadPath: 'Downloads/Anify/Downloaded',
  deleteFilesByDefault: true,
};

export const DEFAULT_FILTERS: FilterOptions = {
  category: 'anime',
  query: '',
  genres: [],
  format: [],
  status: [],
  libraryState: 'Any',
  minScore: 'Any',
  scoreRange: [0, 100],
  selectedYear: 'Any',
  yearRange: [1940, 2028],
  season: [],
  studio: '',
  tagCategory: 'Theme',
  advancedTags: [],
};

interface AppContextType {
  activeCategory: MediaCategory;
  setActiveCategory: (cat: MediaCategory) => void;

  activeNav: NavTab;
  setActiveNav: (tab: NavTab) => void;

  selectedMedia: MediaItem | null;
  setSelectedMedia: (media: MediaItem | null) => void;
  openMediaDetails: (media: MediaItem) => void;
  closeMediaDetails: () => void;

  selectedCharacter: Character | null;
  setSelectedCharacter: (c: Character | null) => void;

  showWatchOrder: boolean;
  setShowWatchOrder: (show: boolean) => void;

  showEpisodeSearch: boolean;
  setShowEpisodeSearch: (show: boolean) => void;

  showAddToLibrary: boolean;
  setShowAddToLibrary: (show: boolean) => void;

  showFilterModal: boolean;
  setShowFilterModal: (show: boolean) => void;

  activeLibraryStatus: LibraryStatus | 'Favorites' | null;
  setActiveLibraryStatus: (status: LibraryStatus | 'Favorites' | null) => void;

  activeVideoEpisode: { media: MediaItem; episodeNumber: number } | null;
  setActiveVideoEpisode: (ep: { media: MediaItem; episodeNumber: number } | null) => void;

  activeReader: { media: MediaItem; chapterNumber: number } | null;
  setActiveReader: (r: { media: MediaItem; chapterNumber: number } | null) => void;

  userLibrary: UserLibraryEntry[];
  addToLibrary: (media: MediaItem, status: LibraryStatus) => void;
  removeFromLibrary: (mediaId: string | number) => void;
  updateLibraryProgress: (mediaId: string | number, progress: number) => void;
  toggleFavorite: (media: MediaItem) => void;
  getLibraryEntry: (mediaId: string | number) => UserLibraryEntry | undefined;

  recentActivity: RecentActivityItem[];

  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;

  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;

  toastMessage: string | null;
  showToast: (msg: string) => void;

  settingsSubPage: string | null;
  setSettingsSubPage: (page: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('anime');
  const [activeNav, setActiveNav] = useState<NavTab>('home');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showWatchOrder, setShowWatchOrder] = useState<boolean>(false);
  const [showEpisodeSearch, setShowEpisodeSearch] = useState<boolean>(false);
  const [showAddToLibrary, setShowAddToLibrary] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [activeLibraryStatus, setActiveLibraryStatus] = useState<LibraryStatus | 'Favorites' | null>(null);

  const [activeVideoEpisode, setActiveVideoEpisode] = useState<{ media: MediaItem; episodeNumber: number } | null>(null);
  const [activeReader, setActiveReader] = useState<{ media: MediaItem; chapterNumber: number } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settingsSubPage, setSettingsSubPage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // User Library state
  const [userLibrary, setUserLibrary] = useState<UserLibraryEntry[]>(() => {
    const saved = localStorage.getItem('satori_user_library');
    return saved ? JSON.parse(saved) : INITIAL_USER_LIBRARY;
  });

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(() => {
    const saved = localStorage.getItem('satori_recent_activity');
    return saved ? JSON.parse(saved) : INITIAL_RECENT_ACTIVITY;
  });

  // Settings
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('satori_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('satori_user_library', JSON.stringify(userLibrary));
  }, [userLibrary]);

  useEffect(() => {
    localStorage.setItem('satori_recent_activity', JSON.stringify(recentActivity));
  }, [recentActivity]);

  useEffect(() => {
    localStorage.setItem('satori_settings', JSON.stringify(settings));
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const openMediaDetails = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const closeMediaDetails = () => {
    setSelectedMedia(null);
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, category: activeCategory });
  };

  const addToLibrary = (media: MediaItem, status: LibraryStatus) => {
    setUserLibrary((prev) => {
      const existingIdx = prev.findIndex((item) => String(item.mediaId) === String(media.id));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          lastUpdated: 'Just now',
        };
        return updated;
      }
      const newEntry: UserLibraryEntry = {
        id: `lib-${Date.now()}`,
        mediaId: media.id,
        title: media.title,
        coverImage: media.coverImage,
        category: media.category,
        status,
        currentProgress: 1,
        totalCount: media.totalEpisodes || media.totalChapters || media.totalVolumes || 12,
        lastUpdated: 'Just now',
        score: media.score,
        isFavorite: false,
      };
      return [newEntry, ...prev];
    });

    // Also add to recent activity
    const newAct: RecentActivityItem = {
      id: `act-${Date.now()}`,
      mediaId: media.id,
      title: media.title,
      coverImage: media.coverImage,
      type: media.category === 'anime' ? 'WATCHING' : 'READING',
      timeAgo: 'Just now',
    };
    setRecentActivity((prev) => [newAct, ...prev.filter((a) => String(a.mediaId) !== String(media.id))]);
    showToast(`Added to ${status}`);
    setShowAddToLibrary(false);
  };

  const removeFromLibrary = (mediaId: string | number) => {
    setUserLibrary((prev) => prev.filter((item) => String(item.mediaId) !== String(mediaId)));
    showToast('Removed from library');
    setShowAddToLibrary(false);
  };

  const updateLibraryProgress = (mediaId: string | number, progress: number) => {
    setUserLibrary((prev) =>
      prev.map((item) =>
        String(item.mediaId) === String(mediaId)
          ? { ...item, currentProgress: progress, lastUpdated: 'Just now' }
          : item
      )
    );
  };

  const toggleFavorite = (media: MediaItem) => {
    const entry = userLibrary.find((i) => String(i.mediaId) === String(media.id));
    if (entry) {
      const isFav = !entry.isFavorite;
      setUserLibrary((prev) =>
        prev.map((i) =>
          String(i.mediaId) === String(media.id) ? { ...i, isFavorite: isFav } : i
        )
      );
      showToast(isFav ? 'Added to favorites' : 'Removed from favorites');
    } else {
      const newEntry: UserLibraryEntry = {
        id: `lib-${Date.now()}`,
        mediaId: media.id,
        title: media.title,
        coverImage: media.coverImage,
        category: media.category,
        status: media.category === 'anime' ? 'Watching' : 'Reading',
        currentProgress: 1,
        totalCount: media.totalEpisodes || media.totalChapters || 12,
        lastUpdated: 'Just now',
        score: media.score,
        isFavorite: true,
      };
      setUserLibrary((prev) => [newEntry, ...prev]);
      showToast('Added to favorites');
    }
  };

  const getLibraryEntry = (mediaId: string | number) => {
    return userLibrary.find((i) => String(i.mediaId) === String(mediaId));
  };

  return (
    <AppContext.Provider
      value={{
        activeCategory,
        setActiveCategory,
        activeNav,
        setActiveNav,
        selectedMedia,
        setSelectedMedia,
        openMediaDetails,
        closeMediaDetails,
        selectedCharacter,
        setSelectedCharacter,
        showWatchOrder,
        setShowWatchOrder,
        showEpisodeSearch,
        setShowEpisodeSearch,
        showAddToLibrary,
        setShowAddToLibrary,
        showFilterModal,
        setShowFilterModal,
        activeLibraryStatus,
        setActiveLibraryStatus,
        activeVideoEpisode,
        setActiveVideoEpisode,
        activeReader,
        setActiveReader,
        userLibrary,
        addToLibrary,
        removeFromLibrary,
        updateLibraryProgress,
        toggleFavorite,
        getLibraryEntry,
        recentActivity,
        filters,
        setFilters,
        resetFilters,
        settings,
        updateSetting,
        toastMessage,
        showToast,
        settingsSubPage,
        setSettingsSubPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
