import React, { useState } from 'react';
import { MessageSquare, Heart, Sparkles, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CommunityView: React.FC = () => {
  const { showToast } = useApp();

  const [activeCommunityTab, setActiveCommunityTab] = useState<'trending' | 'discussions' | 'polls'>('trending');
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});

  const discussions = [
    {
      id: 'disc-1',
      author: 'BleachExpert',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      title: 'Bleach TYBW Part 4: What are your theories on the Wahr Welt final battles?',
      category: 'Anime Discussion',
      time: '2 hours ago',
      likes: 184,
      comments: 67,
      isHot: true,
    },
    {
      id: 'disc-2',
      author: 'ChainsawDevotee',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100',
      title: 'Fujimoto’s art evolution from Fire Punch to Chainsaw Man Part 2',
      category: 'Manga Analysis',
      time: '5 hours ago',
      likes: 92,
      comments: 34,
      isHot: false,
    },
    {
      id: 'disc-3',
      author: 'SubaruSufferingClub',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      title: 'Re:Zero Arc 8 Light Novel translations and volume release schedule',
      category: 'Novel Updates',
      time: '1 day ago',
      likes: 145,
      comments: 51,
      isHot: true,
    },
  ];

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = !likedPosts[id];
    setLikedPosts((prev) => ({ ...prev, [id]: isLiked }));
    showToast(isLiked ? 'Loved discussion thread ❤️' : 'Removed reaction');
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pt-5 pb-32 select-none">
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Top Title & Action */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            Community
          </h1>

          <button
            onClick={() => showToast('New Discussion thread opened')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post</span>
          </button>
        </div>

      {/* Community Tabs */}
      <div className="flex gap-2 p-1 bg-[#12121A] rounded-full border border-white/5">
        {[
          { key: 'trending', label: 'Trending' },
          { key: 'discussions', label: 'Discussions' },
          { key: 'polls', label: 'Polls & Votes' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCommunityTab(tab.key as any)}
            className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeCommunityTab === tab.key
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seasonal Community Poll Card */}
      <div className="p-4 bg-gradient-to-br from-purple-950/40 via-[#13131C] to-indigo-950/30 rounded-3xl border border-purple-500/20 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Weekly Anime of the Season Poll</span>
        </div>
        <h3 className="text-sm font-bold text-white">
          Which Summer 2026 premiere exceeded your expectations the most?
        </h3>
        <div className="space-y-2 pt-1">
          {[
            { name: 'BLEACH: TYBW - The Calamity', pct: '48%' },
            { name: 'Mushoku Tensei S2 Part 2', pct: '28%' },
            { name: 'Smoking Behind the Supermarket', pct: '14%' },
            { name: 'Saga of Tanya Season 2', pct: '10%' },
          ].map((opt) => (
            <div
              key={opt.name}
              onClick={() => showToast(`Voted for ${opt.name}`)}
              className="relative overflow-hidden p-2.5 rounded-2xl bg-black/40 border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
            >
              <div
                className="absolute inset-0 bg-purple-600/20 rounded-2xl"
                style={{ width: opt.pct }}
              />
              <div className="relative flex justify-between items-center text-xs font-bold text-white">
                <span>{opt.name}</span>
                <span className="text-purple-300">{opt.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion Threads List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white/60 px-1">
          <span>Active Topics</span>
          <span>{discussions.length} Threads</span>
        </div>

        <div className="space-y-3">
          {discussions.map((item) => {
            const isLiked = !!likedPosts[item.id];
            const currentLikes = item.likes + (isLiked ? 1 : 0);

            return (
              <div
                key={item.id}
                onClick={() => showToast('Opening discussion thread...')}
                className="p-4 bg-[#13131D] rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.author}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
                        {item.author ? item.author.slice(0, 1) : 'U'}
                      </div>
                    )}
                    <span className="text-xs font-bold text-white/80">{item.author}</span>
                    <span className="text-[10px] text-white/40">· {item.time}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 font-semibold">
                    {item.category}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{item.title}</h4>

                <div className="flex items-center gap-4 text-xs text-white/60 pt-1">
                  <button
                    onClick={(e) => handleLike(item.id, e)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30'
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current text-rose-500' : 'text-rose-400'}`} />
                    <span>{currentLikes}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-white/40" />
                    <span>{item.comments}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};
