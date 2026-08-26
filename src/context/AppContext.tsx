import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MediaItem,
  MediaCategory,
  Character,
  UserLibraryEntry,
  RecentActivityItem,
  FilterOptions,
  LibraryStatus,
  SettingsState,
  AccentColorKey,
  NavTab,
} from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

export type { NavTab };

export const ACCENT_COLOR_MAP: Record<AccentColorKey, { bg: string; text: string; hex: string }> = {
  Purple: { bg: 'bg-purple-500', text: 'text-purple-400', hex: '#a855f7' },
  Blue: { bg: 'bg-blue-500', text: 'text-blue-400', hex: '#3b82f6' },
  Teal: { bg: 'bg-teal-500', text: 'text-teal-400', hex: '#14b8a6' },
  Emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', hex: '#10b981' },
  Amber: { bg: 'bg-amber-500', text: 'text-amber-400', hex: '#f59e0b' },
  Coral: { bg: 'bg-orange-500', text: 'text-orange-400', hex: '#f97316' },
  Rose: { bg: 'bg-rose-500', text: 'text-rose-400', hex: '#f43f5e' },
  Red: { bg: 'bg-red-500', text: 'text-red-400', hex: '#ef4444' },
  Lime: { bg: 'bg-lime-500', text: 'text-lime-400', hex: '#84cc16' },
};

export const DEFAULT_SETTINGS: SettingsState = {
  appLanguage: 'English',
  appHaptics: true,
  deviceNotifications: true,
  dns: 'System Default',
  enableTrailers: true,
  trailersStartMuted: true,
  cacheLimit: '2 GB',
  pureBlackMode: true,
  accentColor: 'Purple',
  glassBlur: 16,
  glassSaturation: 100,
  glassRefraction: 50,
  glassTint: 20,
  homepageMetadata: 'AniList',
  titleLanguage: 'English',
  showLibraryProgress: true,
  fillerList: true,
  gestures: true,
  ambientLight: true,
  autoSkipFiller: false,
  sleepTimer: 'Off',
  videoQuality: '1080p',
  audioPreference: 'Japanese',
  subtitleLanguage: 'English',
  subtitlePreference: 'Softsubs',
  subtitleFont: 'Inter',
  subtitleSize: 16,
  subtitleElevation: 10,
  playbackSpeed: '1.0x',
  mangaReaderMode: 'Webtoon',
  pageTurnAnimation: 'Slide',
  pagedReaderDirection: 'Right to Left',
  imageScale: 'Fit',
  zoomStart: 'Center',
  tapNavigation: 'Edges',
  readerBackground: 'Black',
  cropBorders: false,
  webtoonCropBorders: false,
  automaticWebtoon: true,
  widePageZoom: true,
  keepScreenOn: true,
  preloadPages: 5,
  downloadPath: '/storage/emulated/0/Download/Satori',
  deleteFilesByDefault: false,
};

export const INITIAL_USER_LIBRARY: UserLibraryEntry[] = [];
export const INITIAL_RECENT_ACTIVITY: RecentActivityItem[] = [];

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

  activeReader: { media: MediaItem; chapterNumber: number; chapterId?: string } | null;
  setActiveReader: (r: { media: MediaItem; chapterNumber: number; chapterId?: string } | null) => void;

  // Personal Library state (Watching, Reading, Planning, Completed, Dropped)
  userLibrary: UserLibraryEntry[];
  addToLibrary: (media: MediaItem, status: LibraryStatus) => void;
  removeFromLibrary: (mediaId: string | number) => void;
  updateLibraryProgress: (mediaId: string | number, progress: number) => void;
  getLibraryEntry: (mediaId: string | number) => UserLibraryEntry | undefined;

  // Independent Favorites state (strictly profile favorites, not saved as a library status)
  userFavorites: MediaItem[];
  isMediaFavorite: (mediaId: string | number) => boolean;
  toggleFavorite: (media: MediaItem) => void;

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
  const [activeReader, setActiveReader] = useState<{ media: MediaItem; chapterNumber: number; chapterId?: string } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settingsSubPage, setSettingsSubPage] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // User Library state (Watching, Reading, Planning, Completed, Dropped)
  const [userLibrary, setUserLibrary] = useState<UserLibraryEntry[]>(() => {
    return safeGetItem<UserLibraryEntry[]>('satori_user_library', INITIAL_USER_LIBRARY, true);
  });

  // Dedicated User Favorites state (persisted independently)
  const [userFavorites, setUserFavorites] = useState<MediaItem[]>(() => {
    return safeGetItem<MediaItem[]>('satori_user_favorites', [], true);
  });

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(() => {
    return safeGetItem<RecentActivityItem[]>('satori_recent_activity', INITIAL_RECENT_ACTIVITY, true);
  });

  // Settings
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = safeGetItem<Partial<SettingsState> | null>('satori_settings', null, true);
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    safeSetItem('satori_user_library', userLibrary, true);
  }, [userLibrary]);

  useEffect(() => {
    safeSetItem('satori_user_favorites', userFavorites, true);
  }, [userFavorites]);

  useEffect(() => {
    safeSetItem('satori_recent_activity', recentActivity, true);
  }, [recentActivity]);

  useEffect(() => {
    safeSetItem('satori_settings', settings, true);
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
      const isFav = userFavorites.some((f) => String(f.id) === String(media.id));
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
        isFavorite: isFav,
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

  const isMediaFavorite = (mediaId: string | number) => {
    return userFavorites.some((item) => String(item.id) === String(mediaId));
  };

  const toggleFavorite = (media: MediaItem) => {
    const isCurrentlyFav = userFavorites.some((i) => String(i.id) === String(media.id));

    if (isCurrentlyFav) {
      // Remove from favorites
      setUserFavorites((prev) => prev.filter((i) => String(i.id) !== String(media.id)));
      // If it exists in userLibrary, simply toggle isFavorite flag without affecting library status
      setUserLibrary((prev) =>
        prev.map((i) =>
          String(i.mediaId) === String(media.id) ? { ...i, isFavorite: false } : i
        )
      );
      showToast('Removed from favorites');
    } else {
      // Add to favorites list directly (does NOT create any Watching/Reading library entry)
      const favItem: MediaItem = {
        id: String(media.id),
        title: media.title,
        romajiTitle: media.romajiTitle,
        nativeTitle: media.nativeTitle,
        coverImage: media.coverImage,
        bannerImage: media.bannerImage,
        category: media.category,
        format: media.format,
        status: media.status,
        score: media.score,
        year: media.year,
        genres: media.genres,
        description: media.description,
        studio: media.studio,
        author: media.author,
        communityHearts: media.communityHearts,
      };

      setUserFavorites((prev) => [favItem, ...prev.filter((i) => String(i.id) !== String(media.id))]);
      // If it exists in userLibrary, simply sync isFavorite flag
      setUserLibrary((prev) =>
        prev.map((i) =>
          String(i.mediaId) === String(media.id) ? { ...i, isFavorite: true } : i
        )
      );
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
        getLibraryEntry,
        userFavorites,
        isMediaFavorite,
        toggleFavorite,
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
