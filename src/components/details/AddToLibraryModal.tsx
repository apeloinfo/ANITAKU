import React from 'react';
import { BookOpen, Bookmark, CheckCircle2, Trash2, X } from 'lucide-react';
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

  const currentEntry = getLibraryEntry(selectedMedia.id);

  const isAnime = selectedMedia.category === 'anime';

  const options: { status: LibraryStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
      status: isAnime ? 'Watching' : 'Reading',
      label: isAnime ? 'Watching' : 'Reading',
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      color: 'hover:bg-emerald-600/20 hover:border-emerald-500/40',
    },
    {
      status: 'Planning',
      label: 'Planning',
      icon: <Bookmark className="w-5 h-5 text-blue-400" />,
      color: 'hover:bg-blue-600/20 hover:border-blue-500/40',
    },
    {
      status: 'Completed',
      label: 'Completed',
      icon: <CheckCircle2 className="w-5 h-5 text-purple-400" />,
      color: 'hover:bg-purple-600/20 hover:border-purple-500/40',
    },
    {
      status: 'Dropped',
      label: 'Dropped',
      icon: <Trash2 className="w-5 h-5 text-red-400" />,
      color: 'hover:bg-red-600/20 hover:border-red-500/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={() => setShowAddToLibrary(false)}
      />

      {/* Bottom Sheet Card */}
      <div className="relative w-full max-w-md bg-[#12121A] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-200">
        {/* Handle Bar on mobile */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 sm:hidden" />

        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Save to Library</h3>
            <p className="text-xs text-white/50 line-clamp-1">{selectedMedia.title}</p>
          </div>
          <button
            onClick={() => setShowAddToLibrary(false)}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Option List */}
        <div className="space-y-2 pt-1">
          {options.map((opt) => {
            const isSelected = currentEntry?.status === opt.status;
            return (
              <button
                key={opt.status}
                onClick={() => addToLibrary(selectedMedia, opt.status)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#181822] border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 bg-purple-600/20 text-white shadow-lg'
                    : `border-white/5 text-white/90 ${opt.color}`
                }`}
              >
                <div className="flex items-center gap-3">
                  {opt.icon}
                  <span className="text-sm font-bold">{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500 text-white font-bold">
                    Active
                  </span>
                )}
              </button>
            );
          })}

          {/* Remove from library option if in library */}
          {currentEntry && (
            <button
              onClick={() => removeFromLibrary(selectedMedia.id)}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/20 text-red-400 font-bold text-xs hover:bg-red-900/40 transition-colors cursor-pointer mt-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove from Library</span>
            </button>
          )}

          {/* Cancel button */}
          <button
            onClick={() => setShowAddToLibrary(false)}
            className="w-full py-3 text-center text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
