import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../../types';
import { safeGetItem } from '../../utils/storage';

export type MainTab = 'home' | 'profile' | 'community' | 'schedule' | 'search' | 'settings';

interface BottomNavProps {
  activeTab?: MainTab;
  onTabChange?: (tab: MainTab) => void;
  userInitials?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab: propActiveTab,
  onTabChange: propOnTabChange,
  userInitials: propUserInitials,
}) => {
  const {
    activeNav,
    setActiveNav,
    closeMediaDetails,
    setActiveLibraryStatus,
    setSettingsSubPage,
    showFilterModal,
    selectedMedia,
    activeVideoEpisode,
    activeReader,
  } = useApp();

  // Hide the floating bottom nav when filter modal or full-screen overlays are open
  if (showFilterModal || selectedMedia || activeVideoEpisode || activeReader) {
    return null;
  }

  const currentTab = (propActiveTab || activeNav) as MainTab;

  const handleTabClick = (tab: MainTab) => {
    if (propOnTabChange) {
      propOnTabChange(tab);
    } else {
      closeMediaDetails();
      setActiveLibraryStatus(null);
      setSettingsSubPage(null);
      setActiveNav(tab as NavTab);
    }
  };

  // Get user profile initials dynamically (fallback to MD)
  const profileName = safeGetItem('satori_profile_name', 'MD');
  const userInitials =
    propUserInitials || profileName.trim().slice(0, 2).toUpperCase() || 'MD';

  const tabs = [
    {
      id: 'home' as MainTab,
      label: 'Home',
      renderIcon: (isActive: boolean) => (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#C084FC' : '#FFFFFF'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isActive ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.85))' : 'none',
          }}
        >
          <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" />
          <line x1="10" y1="18" x2="14" y2="18" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'profile' as MainTab,
      label: 'Profile',
      renderIcon: (isActive: boolean) => (
        <div
          className={`w-[32px] h-[32px] rounded-full bg-[#0284C7] text-white text-[13px] font-black flex items-center justify-center tracking-tight transition-all duration-200 ${
            isActive ? 'ring-2 ring-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.85)]' : ''
          }`}
        >
          {userInitials}
        </div>
      ),
    },
    {
      id: 'community' as MainTab,
      label: 'Community',
      renderIcon: (isActive: boolean) => (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#C084FC' : '#FFFFFF'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isActive ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.85))' : 'none',
          }}
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'schedule' as MainTab,
      label: 'Schedule',
      renderIcon: (isActive: boolean) => (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#C084FC' : '#FFFFFF'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isActive ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.85))' : 'none',
          }}
        >
          <rect x="3" y="4" width="18" height="18" rx="4" strokeWidth="2" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2.2" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2.2" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
          <circle cx="8" cy="14" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
          <circle cx="12" cy="14" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
          <circle cx="16" cy="14" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
          <circle cx="8" cy="18" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
          <circle cx="12" cy="18" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
          <circle cx="16" cy="18" r="1.2" fill={isActive ? '#C084FC' : '#FFFFFF'} stroke="none" />
        </svg>
      ),
    },
    {
      id: 'search' as MainTab,
      label: 'Search',
      renderIcon: (isActive: boolean) => (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#C084FC' : '#FFFFFF'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isActive ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.85))' : 'none',
          }}
        >
          <circle cx="11" cy="11" r="7.5" strokeWidth="2.2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'settings' as MainTab,
      label: 'Settings',
      renderIcon: (isActive: boolean) => (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isActive ? '#C084FC' : '#FFFFFF'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: isActive ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.85))' : 'none',
          }}
        >
          <path d="M12 2l8.2 4.75v9.5L12 21l-8.2-4.75v-9.5L12 2z" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="12" cy="11.5" r="2.8" strokeWidth="2.2" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      id="bottom-floating-navigation"
      aria-label="Main Navigation"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-14px)] max-w-[560px] sm:max-w-[620px] md:max-w-[660px] h-[70px] rounded-full z-[99999] bg-transparent border border-white/10 shadow-2xl flex items-center justify-between gap-1.5 px-2.5 sm:px-4 py-2 select-none"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-item-${tab.id}`}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className="relative flex-1 h-[52px] flex items-center justify-center rounded-full cursor-pointer focus:outline-none"
            aria-label={tab.label}
          >
            {/* Active Capsule Pill Overlay */}
            {isActive && (
              <div className="absolute -inset-y-[1px] -inset-x-[1.8px] rounded-full bg-white/10 border border-white/15 shadow-none pointer-events-none z-0" />
            )}

            {/* Icon Render */}
            <span className="relative z-10 flex items-center justify-center">
              {tab.renderIcon(isActive)}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export const BottomNavigationBar = BottomNav;

