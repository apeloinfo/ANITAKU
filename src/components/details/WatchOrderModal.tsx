import React from 'react';
import { ArrowLeft, Star, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getRatingDisplay } from '../../utils/rating';
import { PosterImage } from '../common/PosterImage';

export const WatchOrderModal: React.FC = () => {
  const { selectedMedia, showWatchOrder, setShowWatchOrder, openMediaDetails } = useApp();

  if (!showWatchOrder || !selectedMedia) return null;

  const watchOrderList = selectedMedia.watchOrder || [
    {
      id: 'wo-1',
      orderNumber: 1,
      title: `${selectedMedia.title} (Prologue / Prequel)`,
      franchiseTitle: 'Special / OVA',
      score: 7.4,
      memberCount: '74,486',
      coverImage: selectedMedia.coverImage,
    },
    {
      id: 'wo-2',
      orderNumber: 2,
      title: selectedMedia.title,
      franchiseTitle: 'Main TV Series',
      score: selectedMedia.score,
      memberCount: '1,271,990',
      coverImage: selectedMedia.coverImage,
    },
    {
      id: 'wo-3',
      orderNumber: 3,
      title: `${selectedMedia.title} - The Final Arc`,
      franchiseTitle: 'Sequel TV Series',
      score: 8.8,
      memberCount: '385,213',
      coverImage: selectedMedia.bannerImage || selectedMedia.coverImage,
    },
  ];

  return (
    <div className="fixed inset-0 z-[2000] bg-black overflow-y-auto no-scrollbar pb-24 text-white animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 p-4 bg-black/85 backdrop-blur-xl border-b border-white/10">
        <button
          onClick={() => setShowWatchOrder(false)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-white">Watch Order</h2>
      </div>

      {/* Main List */}
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {watchOrderList.map((item, index) => (
          <div
            key={item.id || index}
            className="flex items-center gap-3.5 p-3 bg-[#13131A] rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer shadow-lg"
          >
            {/* Order Number Badge (#1, #2...) */}
            <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 font-extrabold text-sm flex items-center justify-center shrink-0">
              #{item.orderNumber || index + 1}
            </div>

            {/* Poster Thumbnail */}
            {item.coverImage && (
              <PosterImage
                src={item.coverImage}
                alt={item.title}
                className="w-12 h-16 rounded-xl shadow-md shrink-0"
              />
            )}

            {/* Information */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{item.title}</h3>
              {item.franchiseTitle && (
                <p className="text-[11px] text-white/50 font-medium mt-0.5">{item.franchiseTitle}</p>
              )}

              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/60">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{getRatingDisplay(item.score)}</span>
                </span>
                {item.memberCount && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-white/40" />
                    <span>{item.memberCount}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
