import React from 'react';
import { Tv, BookOpen, Bookmark, CheckCheck, Trash2, MinusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LibraryStatus } from '../../types';

export const AddToLibraryModal: React.FC = () => {
  const {
    selectedMedia,
    showAddToLibrary,
    setShowAddToLibrary,
    addToLibrary,
    removeFromLibrary,
    getLibraryEntry,
  } = useApp();

  if (!showAddToLibrary || !selectedMedia) return null;

  // Actual current user library entry from persistent state
  const currentEntry = getLibraryEntry(selectedMedia.id);
  const currentStatus = currentEntry?.status;
  const isAnime = selectedMedia.category === 'anime';

  const statusOptions: {
    status: LibraryStatus;
    label: string;
    icon: React.ReactNode;
    cardStyle: string;
  }[] = [
    {
      status: isAnime ? 'Watching' : 'Reading',
      label: isAnime ? 'Watching' : 'Reading',
      icon: isAnime ? (
        <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
      ),
      cardStyle: 'bg-[#0e1913] border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40',
    },
    {
      status: 'Planning',
      label: 'Planning',
      icon: <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />,
      cardStyle: 'bg-[#18130a] border-amber-600/50 text-amber-400 hover:bg-amber-950/40',
    },
    {
      status: 'Completed',
      label: 'Completed',
      icon: <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />,
      cardStyle: 'bg-[#0b1420] border-sky-600/50 text-sky-400 hover:bg-sky-950/40',
    },
    {
      status: 'Dropped',
      label: 'Dropped',
      icon: <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />,
      cardStyle: 'bg-[#1a0a0e] border-rose-600/50 text-rose-400 hover:bg-rose-950/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={() => setShowAddToLibrary(false)} />

      {/* Centered Modal Card matching Reference Screenshots */}
      <div className="relative w-full max-w-[325px] sm:max-w-[345px] bg-[#121217] border border-white/10 rounded-[26px] p-5 space-y-2.5 z-10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-150">
        {/* Title */}
        <h3 className="text-xl font-bold text-white tracking-tight pb-1">Add to Library</h3>

        {/* Status Option List */}
        <div className="space-y-2 pt-1">
          {statusOptions.map((opt) => {
            const isCurrent = currentStatus === opt.status;
            return (
              <button
                key={opt.status}
                onClick={() => addToLibrary(selectedMedia, opt.status)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all cursor-pointer text-left active:scale-[0.98] ${opt.cardStyle}`}
              >
                <div className="flex items-center gap-3">
                  {opt.icon}
                  <span className="text-sm font-bold">{opt.label}</span>
                </div>

                {isCurrent && (
                  <span className="text-xs font-bold text-white tracking-wide">Current</span>
                )}
              </button>
            );
          })}

          {/* 5th Option: Remove from Library (Rendered strictly when an existing status is present) */}
          {currentEntry && (
            <button
              onClick={() => removeFromLibrary(selectedMedia.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/20 bg-[#15151c] text-white hover:bg-white/10 transition-all cursor-pointer text-left active:scale-[0.98]"
            >
              <MinusCircle className="w-4 h-4 text-white shrink-0" />
              <span className="text-sm font-bold text-white">Remove from Library</span>
            </button>
          )}
        </div>

        {/* Cancel Button */}
        <div className="pt-2 text-center">
          <button
            onClick={() => setShowAddToLibrary(false)}
            className="text-sm font-bold text-white/80 hover:text-white transition-colors cursor-pointer py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
