import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TopCategoryHeader } from '../layout/TopCategoryHeader';
import { HeroCarousel } from './HeroCarousel';
import {
  fetchTrendingAnime,
  fetchPopularThisSeason,
  fetchNewEpisodes,
  fetchCommunityLovedAnime,
  fetchRecentlyCompletedAnime,
  fetchAnimeMovies,
  fetchUpcomingAnime,
  fetchTrendingManga,
  fetchPopularManga,
  fetchRecentlyUpdatedManga,
  fetchCommunityLovedManga,
  fetchRecentlyCompletedManga,
  fetchTrendingNovels,
  fetchSeasonalNovels,
  fetchPopularNovels,
  fetchMonsterNovels,
  fetchPrincessNovels,
  fetchMagicNovels,
} from '../../services/api';
import { MediaItem } from '../../types';
import { MediaHorizontalList, MediaRow } from './MediaHorizontalList';
import { useCachedApi } from '../../hooks/useCachedApi';

export const HomeView: React.FC = () => {
  const {
    activeCategory,
    openMediaDetails,
    userLibrary,
    removeFromLibrary,
  } = useApp();

  // ================= 1. ANIME DYNAMIC SECTIONS (ALL 6 PRESERVED - EXPANDED LIMITLESS FETCH) =================
  const { data: trendingAnime = [] } = useCachedApi('home_anime_trending_15', () => fetchTrendingAnime(15));
  const { data: popularSeason = [], loading: loadingSeason } = useCachedApi('home_anime_popular_season_30', () => fetchPopularThisSeason(30));
  const { data: newEpisodes = [], loading: loadingNewEps } = useCachedApi('home_anime_new_episodes_40', () => fetchNewEpisodes(40));
  const { data: communityLovedAnime = [], loading: loadingLovedAnime } = useCachedApi('home_anime_community_loved_30', () => fetchCommunityLovedAnime(30));
  const { data: recentlyCompletedAnime = [], loading: loadingCompletedAnime } = useCachedApi('home_anime_recently_completed_30', () => fetchRecentlyCompletedAnime(30));
  const { data: animeMovies = [], loading: loadingMovies } = useCachedApi('home_anime_movies_30', () => fetchAnimeMovies(30));
  const { data: upcomingAnime = [], loading: loadingUpcomingAnime } = useCachedApi('home_anime_upcoming_50', () => fetchUpcomingAnime(50));

  // ================= 2. MANGA DYNAMIC SECTIONS (ALL PRESERVED - EXPANDED LIMITLESS FETCH) =================
  const { data: trendingManga = [] } = useCachedApi('home_manga_trending_15', () => fetchTrendingManga(15));
  const { data: popularManga = [], loading: loadingPopManga } = useCachedApi('home_manga_popular_30', () => fetchPopularManga(30));
  const { data: recentlyUpdatedManga = [], loading: loadingUpdatedManga } = useCachedApi('home_manga_recently_updated_40', () => fetchRecentlyUpdatedManga(40));
  const { data: communityLovedManga = [], loading: loadingLovedManga } = useCachedApi('home_manga_community_loved_30', () => fetchCommunityLovedManga(30));
  const { data: recentlyCompletedManga = [], loading: loadingCompletedManga } = useCachedApi('home_manga_recently_completed_30', () => fetchRecentlyCompletedManga(30));

  // ================= 3. NOVEL DYNAMIC SECTIONS (ALL 6 PRESERVED - EXPANDED LIMITLESS FETCH) =================
  const { data: trendingNovels = [] } = useCachedApi('home_novel_trending_15', () => fetchTrendingNovels(15));
  const { data: seasonalNovels = [], loading: loadingSeasonalNovels } = useCachedApi('home_novel_seasonal_30', () => fetchSeasonalNovels(30));
  const { data: popularNovels = [], loading: loadingPopNovels } = useCachedApi('home_novel_popular_30', () => fetchPopularNovels(30));
  const { data: monsterNovels = [], loading: loadingMonsterNovels } = useCachedApi('home_novel_monsters_30', () => fetchMonsterNovels(30));
  const { data: princessNovels = [], loading: loadingPrincessNovels } = useCachedApi('home_novel_princess_30', () => fetchPrincessNovels(30));
  const { data: magicNovels = [], loading: loadingMagicNovels } = useCachedApi('home_novel_magic_30', () => fetchMagicNovels(30));

  // Dynamic hero items selection based on active category
  const heroItems = useMemo(() => {
    if (activeCategory === 'anime') return trendingAnime;
    if (activeCategory === 'manga') return trendingManga;
    if (activeCategory === 'novel') return trendingNovels;
    return [];
  }, [activeCategory, trendingAnime, trendingManga, trendingNovels]);

  // Combined loading indicator per category
  const loading = useMemo(() => {
    if (activeCategory === 'anime') {
      return loadingSeason && popularSeason.length === 0;
    }
    if (activeCategory === 'manga') {
      return loadingPopManga && popularManga.length === 0;
    }
    if (activeCategory === 'novel') {
      return loadingSeasonalNovels && seasonalNovels.length === 0;
    }
    return false;
  }, [
    activeCategory,
    loadingSeason,
    popularSeason.length,
    loadingPopManga,
    popularManga.length,
    loadingSeasonalNovels,
    seasonalNovels.length,
  ]);

  // Manga continue reading items from user library
  const continueReadingItems = userLibrary.filter(
    (item) => item.category === 'manga' && item.status === 'Reading'
  );


  return (
    <div className="w-full min-h-screen bg-black text-white pb-28 select-none">
      {/* 1. HERO CAROUSEL BANNER & GRADIENT FADE */}
      <HeroCarousel
        activeCategory={activeCategory}
        onSelectMedia={openMediaDetails}
        passedItems={heroItems}
      />

      {/* 2. CATEGORY SWITCHER CAPSULE PILLS (ANIME / MANGA / NOVEL) */}
      <div className="px-4 mt-3 mb-2">
        <TopCategoryHeader />
      </div>

      {/* 3. DYNAMIC CONTENT SECTIONS BY CATEGORY (Zero-Latency Persistent Mount) */}
      <div className="px-4 mt-4">
        {/* ===================== ANIME TAB (ALL 6 SECTIONS INTACT) ===================== */}
        <div className={activeCategory === 'anime' ? 'space-y-6 block' : 'hidden'}>
          {/* 1. Popular This Season */}
          <SectionHeader firstWord="Popular" secondWord="This Season" highlight="first" />
          <MediaRow items={popularSeason} loading={loading} showScore />

          {/* 2. New Episodes */}
          <SectionHeader firstWord="New" secondWord="Episodes" highlight="second" />
          <MediaRow items={newEpisodes} loading={loading} showEpisodeBadge />

          {/* 3. Community Loved */}
          <SectionHeader firstWord="Community" secondWord="Loved" highlight="first" />
          <MediaRow items={communityLovedAnime} loading={loading} showScore={false} showHeartCount={false} />

          {/* 4. Recently Completed */}
          <SectionHeader firstWord="Recently" secondWord="Completed" highlight="first" />
          <MediaRow items={recentlyCompletedAnime} loading={loading} showScore />

          {/* 5. Movies */}
          <SectionHeader firstWord="Movies" highlight="first" />
          <MediaRow items={animeMovies} loading={loading} showScore />

          {/* 6. Upcoming Anime */}
          <SectionHeader firstWord="Upcoming" secondWord="Anime" highlight="first" />
          <MediaRow items={upcomingAnime} loading={loading} isUpcoming showScore={false} />
        </div>

        {/* ===================== MANGA TAB (ALL DYNAMIC SECTIONS INTACT) ===================== */}
        <div className={activeCategory === 'manga' ? 'space-y-6 block' : 'hidden'}>
          {/* 1. Continue Reading Card */}
          {continueReadingItems.length > 0 && (
            <div className="space-y-2">
              <SectionHeader firstWord="Continue" secondWord="Reading" highlight="first" />
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
                {continueReadingItems.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      const m = popularManga.find((x) => String(x.id) === String(entry.mediaId)) || {
                        id: entry.mediaId,
                        title: entry.title,
                        coverImage: entry.coverImage,
                        category: 'manga',
                        format: 'Manga',
                        status: 'Releasing',
                        score: entry.score || 8.5,
                        year: 2026,
                        genres: ['Action', 'Adventure'],
                        description: 'Continue reading from your library.',
                      };
                      openMediaDetails(m as MediaItem);
                    }}
                    className="relative min-w-[280px] sm:min-w-[320px] bg-[#14141A] rounded-2xl p-3 border border-white/10 flex items-center gap-3 cursor-pointer hover:border-white/20 transition-all shadow-lg"
                  >
                    <img
                      src={entry.coverImage}
                      alt={entry.title}
                      className="w-16 h-22 object-cover rounded-xl shadow-md shrink-0"
                    />
                    <div className="flex-1 min-w-0 pr-6">
                      <h3 className="text-sm font-bold text-white line-clamp-2">{entry.title}</h3>
                      <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/10">
                        Chapter {entry.currentProgress}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromLibrary(entry.mediaId);
                      }}
                      className="absolute top-2.5 right-2.5 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Popular Manga */}
          <SectionHeader firstWord="Popular" secondWord="Manga" highlight="first" />
          <MediaRow items={popularManga} loading={loading} showScore />

          {/* 3. Recently Updated */}
          <SectionHeader firstWord="Recently" secondWord="Updated" highlight="second" />
          <MediaRow items={recentlyUpdatedManga} loading={loading} showScore />

          {/* 4. Community Loved Manga */}
          <SectionHeader firstWord="Community" secondWord="Loved" highlight="first" />
          <MediaRow items={communityLovedManga} loading={loading} showScore={false} showHeartCount={false} />

          {/* 5. Recently Completed */}
          <SectionHeader firstWord="Recently" secondWord="Completed" highlight="first" />
          <MediaRow items={recentlyCompletedManga} loading={loading} showScore />
        </div>

        {/* ===================== NOVEL TAB (ALL 6 SECTIONS INTACT) ===================== */}
        <div className={activeCategory === 'novel' ? 'space-y-6 block' : 'hidden'}>
          {/* 1. Top Seasonal Banner: Summer 2026 Novels */}
          <SectionHeader firstWord="Summer 2026" secondWord="Novels" highlight="first" />
          <MediaRow items={seasonalNovels} loading={loading} showScore />

          {/* 2. Popular Novels */}
          <SectionHeader firstWord="Popular" secondWord="Novels" highlight="first" />
          <MediaRow items={popularNovels} loading={loading} showScore />

          {/* 3. Monsters Section */}
          <SectionHeader firstWord="Monsters" highlight="first" />
          <MediaRow items={monsterNovels} loading={loading} showScore />

          {/* 4. Princess Section */}
          <SectionHeader firstWord="Princess" highlight="first" />
          <MediaRow items={princessNovels} loading={loading} showScore />

          {/* 5. Magic Section */}
          <SectionHeader firstWord="Magic" highlight="first" />
          <MediaRow items={magicNovels} loading={loading} showScore />
        </div>
      </div>
    </div>
  );
};

// Section header with green/white accents
interface SectionHeaderProps {
  firstWord: string;
  secondWord?: string;
  highlight?: 'first' | 'second';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  firstWord,
  secondWord,
  highlight = 'first',
}) => {
  return (
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-[17px] sm:text-lg font-bold tracking-tight">
        {highlight === 'first' ? (
          <>
            <span className="text-[#4ade80] font-bold">{firstWord}</span>{' '}
            {secondWord && <span className="text-white font-bold">{secondWord}</span>}
          </>
        ) : (
          <>
            <span className="text-white font-bold">{firstWord}</span>{' '}
            {secondWord && <span className="text-[#4ade80] font-bold">{secondWord}</span>}
          </>
        )}
      </h2>
    </div>
  );
};

