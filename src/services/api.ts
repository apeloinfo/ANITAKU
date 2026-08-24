import {
  MediaItem,
  ScheduleDay,
  UserLibraryEntry,
  RecentActivityItem,
} from '../types';
import * as apiClient from './apiClient';

export * from './apiClient';
export * from './cacheService';
export * from './anifyService';
export * from './logoService';

// Initial Starter Library (persisted in LocalStorage)
export const INITIAL_USER_LIBRARY: UserLibraryEntry[] = [
  {
    id: 'lib-1',
    mediaId: '21',
    title: 'ONE PIECE',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    category: 'anime',
    status: 'Watching',
    currentProgress: 1115,
    totalCount: 1120,
    lastUpdated: 'Today',
    score: 8.9,
    isFavorite: true,
  },
  {
    id: 'lib-2',
    mediaId: '108465',
    title: 'Mushoku Tensei: Jobless Reincarnation Season 2',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
    category: 'anime',
    status: 'Watching',
    currentProgress: 12,
    totalCount: 24,
    lastUpdated: 'Yesterday',
    score: 8.6,
    isFavorite: true,
  },
  {
    id: 'lib-3',
    mediaId: '105778',
    title: 'Chainsaw Man',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
    category: 'manga',
    status: 'Reading',
    currentProgress: 168,
    totalCount: 180,
    lastUpdated: '3 days ago',
    score: 8.7,
    isFavorite: true,
  },
];

// Initial starter recent activity
export const INITIAL_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'act-1',
    mediaId: '21',
    title: 'ONE PIECE',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    type: 'WATCHING',
    timeAgo: '12m ago',
  },
  {
    id: 'act-2',
    mediaId: '105778',
    title: 'Chainsaw Man',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
    type: 'READING',
    timeAgo: '2h ago',
  },
];
