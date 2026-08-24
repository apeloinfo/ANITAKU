import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Tv,
  BookOpen,
  Download,
  Info,
  ChevronRight,
  ArrowLeft,
  Check,
  Moon,
  Sparkles,
  Volume2,
  Shield,
} from 'lucide-react';
import { useApp, ACCENT_COLOR_MAP } from '../../context/AppContext';
import { AccentColorKey } from '../../types';

export const SettingsView: React.FC = () => {
  const { settings, updateSetting, showToast, settingsSubPage, setSettingsSubPage } = useApp();

  const accentColors: AccentColorKey[] = [
    'Purple',
    'Blue',
    'Teal',
    'Emerald',
    'Amber',
    'Coral',
    'Rose',
    'Red',
    'Lime',
  ];

  const sections = [
    { id: 'general', title: 'General', desc: 'Language, DNS, trailers, haptics & cache', icon: <Sliders className="w-5 h-5 text-purple-400" /> },
    { id: 'appearance', title: 'Appearance', desc: 'Accent colors, Pure Black, Glass effects', icon: <Palette className="w-5 h-5 text-cyan-400" /> },
    { id: 'content', title: 'Content', desc: 'Metadata provider, title language, progress', icon: <Tv className="w-5 h-5 text-blue-400" /> },
    { id: 'playback', title: 'Playback', desc: 'Video quality, audio tracks, subtitles, player gestures', icon: <Volume2 className="w-5 h-5 text-emerald-400" /> },
    { id: 'reader', title: 'Reader', desc: 'Manga & Novel reader mode, background, animations', icon: <BookOpen className="w-5 h-5 text-amber-400" /> },
    { id: 'downloads', title: 'Downloads', desc: 'Storage path, automatic cleanup', icon: <Download className="w-5 h-5 text-rose-400" /> },
    { id: 'about', title: 'About', desc: 'Satori v2.4.0, release notes, legal', icon: <Info className="w-5 h-5 text-white/60" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white pt-5 pb-32 select-none">
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 space-y-5">
        {/* If subpage is selected */}
        {settingsSubPage ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/10">
              <button
                onClick={() => setSettingsSubPage(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md capitalize">
                {settingsSubPage} Settings
              </h1>
            </div>

          {/* ================= GENERAL SUBPAGE ================= */}
          {settingsSubPage === 'general' && (
            <div className="space-y-4">
              {/* App Language */}
              <SettingCard title="App Language">
                <select
                  value={settings.appLanguage}
                  onChange={(e) => {
                    updateSetting('appLanguage', e.target.value);
                    showToast(`Language set to ${e.target.value}`);
                  }}
                  className="w-full bg-[#181824] p-3 rounded-xl border border-white/10 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value="System Default">System Default</option>
                  <option value="English">English</option>
                  <option value="বাংলা - Bengali">বাংলা - Bengali</option>
                  <option value="Deutsch - German">Deutsch - German</option>
                  <option value="Español - Spanish">Español - Spanish</option>
                  <option value="Français - French">Français - French</option>
                  <option value="हिन्दी - Hindi">हिन्दी - Hindi</option>
                  <option value="Bahasa Indonesia - Indonesian">Bahasa Indonesia - Indonesian</option>
                </select>
              </SettingCard>

              {/* Secure DNS Provider */}
              <SettingCard title="Encrypted DNS Provider">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Cloudflare', 'Google', 'AdGuard', 'Off'].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        updateSetting('dns', d);
                        showToast(`DNS set to ${d}`);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        settings.dns === d
                          ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                          : 'bg-[#181824] text-white/70 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </SettingCard>

              {/* Toggles */}
              <SettingToggle
                title="Haptic Feedback"
                desc="Vibrate on tap navigation & gestures"
                value={settings.appHaptics}
                onChange={(v) => updateSetting('appHaptics', v)}
              />

              <SettingToggle
                title="Device Notifications"
                desc="Receive airing alerts for bookmarked anime"
                value={settings.deviceNotifications}
                onChange={(v) => updateSetting('deviceNotifications', v)}
              />

              <SettingToggle
                title="Autoplay Video Trailers"
                desc="Stream preview teasers on media banner"
                value={settings.enableTrailers}
                onChange={(v) => updateSetting('enableTrailers', v)}
              />

              {/* Cache Limit */}
              <SettingCard title="Cache Storage Allocation">
                <select
                  value={settings.cacheLimit}
                  onChange={(e) => {
                    updateSetting('cacheLimit', e.target.value);
                    showToast(`Cache limit: ${e.target.value}`);
                  }}
                  className="w-full bg-[#181824] p-3 rounded-xl border border-white/10 text-xs font-bold text-white focus:outline-none"
                >
                  {['Tiny (250MB)', 'Balanced (1GB)', 'Large (4GB)', 'Unlimited'].map((c) => (
                    <option key={c} value={c.split(' ')[0]}>
                      {c}
                    </option>
                  ))}
                </select>
              </SettingCard>
            </div>
          )}

          {/* ================= APPEARANCE SUBPAGE ================= */}
          {settingsSubPage === 'appearance' && (
            <div className="space-y-4">
              {/* Pure Black Mode */}
              <SettingToggle
                title="Pure Black Mode (OLED)"
                desc="True 100% #000000 black canvas for battery saving"
                value={settings.pureBlackMode}
                onChange={(v) => updateSetting('pureBlackMode', v)}
              />

              {/* 9 Accent Colors Grid */}
              <SettingCard title="Accent Color">
                <div className="grid grid-cols-3 gap-2.5">
                  {accentColors.map((colorKey) => {
                    const item = ACCENT_COLOR_MAP[colorKey];
                    const isSelected = settings.accentColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        onClick={() => {
                          updateSetting('accentColor', colorKey);
                          showToast(`Accent set to ${colorKey}`);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-400 bg-white/10 shadow-lg'
                            : 'border-white/5 bg-[#14141E] hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full shadow-md"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="text-xs font-bold text-white">{colorKey}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </SettingCard>

              {/* Glass Blur Slider */}
              <SettingSlider
                title="Glass Blur Radius"
                value={settings.glassBlur}
                unit="dp"
                min={0}
                max={24}
                step={1}
                onChange={(val) => updateSetting('glassBlur', val)}
              />

              {/* Glass Saturation Slider */}
              <SettingSlider
                title="Glass Saturation Boost"
                value={settings.glassSaturation}
                unit="%"
                min={50}
                max={200}
                step={5}
                onChange={(val) => updateSetting('glassSaturation', val)}
              />

              {/* Glass Refraction Slider */}
              <SettingSlider
                title="Glass Refraction Index"
                value={settings.glassRefraction}
                unit="dp"
                min={0}
                max={30}
                step={1}
                onChange={(val) => updateSetting('glassRefraction', val)}
              />

              {/* Glass Tint Slider */}
              <SettingSlider
                title="Glass Overlay Tint"
                value={settings.glassTint}
                unit="%"
                min={0}
                max={40}
                step={1}
                onChange={(val) => updateSetting('glassTint', val)}
              />
            </div>
          )}

          {/* ================= CONTENT SUBPAGE ================= */}
          {settingsSubPage === 'content' && (
            <div className="space-y-4">
              <SettingCard title="Homepage Metadata Provider">
                <div className="grid grid-cols-3 gap-2">
                  {['Auto', 'AniList', 'MAL'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('homepageMetadata', m)}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        settings.homepageMetadata === m
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#181824] text-white/70'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </SettingCard>

              <SettingCard title="Default Title Language">
                <div className="grid grid-cols-2 gap-2">
                  {['English', 'Romaji'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => updateSetting('titleLanguage', lang)}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        settings.titleLanguage === lang
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#181824] text-white/70'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </SettingCard>

              <SettingToggle
                title="Show Library Progress Badges"
                desc="Display watched/read progress indicators on cards"
                value={settings.showLibraryProgress}
                onChange={(v) => updateSetting('showLibraryProgress', v)}
              />

              <SettingToggle
                title="Highlight Anime Filler Episodes"
                desc="Color-code non-canonical filler episodes in episode selector"
                value={settings.fillerList}
                onChange={(v) => updateSetting('fillerList', v)}
              />
            </div>
          )}

          {/* ================= PLAYBACK SUBPAGE ================= */}
          {settingsSubPage === 'playback' && (
            <div className="space-y-4">
              <SettingToggle
                title="Player Swipe Gestures"
                desc="Swipe left/right to seek, swipe up/down for volume and brightness"
                value={settings.gestures}
                onChange={(v) => updateSetting('gestures', v)}
              />

              <SettingToggle
                title="Ambient Light Sync"
                desc="Dynamic soft glowing backlight reacting to video canvas"
                value={settings.ambientLight}
                onChange={(v) => updateSetting('ambientLight', v)}
              />

              <SettingToggle
                title="Auto Skip Filler Episodes"
                desc="Automatically jump straight to canon storylines"
                value={settings.autoSkipFiller}
                onChange={(v) => updateSetting('autoSkipFiller', v)}
              />

              <SettingCard title="Default Audio Track">
                <select
                  value={settings.audioPreference}
                  onChange={(e) => updateSetting('audioPreference', e.target.value)}
                  className="w-full bg-[#181824] p-3 rounded-xl border border-white/10 text-xs font-bold text-white focus:outline-none"
                >
                  {['Japanese', 'English', 'Hindi', 'Tamil', 'Spanish', 'German', 'French'].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </SettingCard>

              <SettingCard title="Subtitle Font Typography">
                <select
                  value={settings.subtitleFont}
                  onChange={(e) => updateSetting('subtitleFont', e.target.value)}
                  className="w-full bg-[#181824] p-3 rounded-xl border border-white/10 text-xs font-bold text-white focus:outline-none"
                >
                  {['Netflix Sans', 'Outfit', 'Inter', 'Roboto'].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </SettingCard>

              <SettingSlider
                title="Subtitle Font Size"
                value={settings.subtitleSize}
                unit="sp"
                min={12}
                max={28}
                step={1}
                onChange={(val) => updateSetting('subtitleSize', val)}
              />
            </div>
          )}

          {/* ================= READER SUBPAGE ================= */}
          {settingsSubPage === 'reader' && (
            <div className="space-y-4">
              <SettingCard title="Default Manga Reader Mode">
                <div className="grid grid-cols-3 gap-2">
                  {['Webtoon', 'Paged', 'Vertical'].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('mangaReaderMode', m as any)}
                      className={`py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        settings.mangaReaderMode === m
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#181824] text-white/70'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </SettingCard>

              <SettingToggle
                title="Automatic Webtoon Detection"
                desc="Auto-switch to vertical scrolling mode for Korean Manhwa & Webtoons"
                value={settings.automaticWebtoon}
                onChange={(v) => updateSetting('automaticWebtoon', v)}
              />

              <SettingToggle
                title="Crop Page Borders"
                desc="Remove white and black empty gutter margins"
                value={settings.cropBorders}
                onChange={(v) => updateSetting('cropBorders', v)}
              />

              <SettingToggle
                title="Keep Screen Awake"
                desc="Prevent device sleep while actively reading"
                value={settings.keepScreenOn}
                onChange={(v) => updateSetting('keepScreenOn', v)}
              />
            </div>
          )}

          {/* ================= DOWNLOADS SUBPAGE ================= */}
          {settingsSubPage === 'downloads' && (
            <div className="space-y-4">
              <SettingCard title="Storage Location">
                <div className="p-3 bg-[#181824] rounded-xl border border-white/10 text-xs font-mono text-white/80">
                  {settings.downloadPath}
                </div>
              </SettingCard>

              <SettingToggle
                title="Delete Downloaded Episodes Once Watched"
                desc="Automatically free up device storage after viewing"
                value={settings.deleteFilesByDefault}
                onChange={(v) => updateSetting('deleteFilesByDefault', v)}
              />
            </div>
          )}

          {/* ================= ABOUT SUBPAGE ================= */}
          {settingsSubPage === 'about' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-cyan-500 mx-auto flex items-center justify-center font-black text-2xl text-white shadow-[0_0_30px_rgba(168,85,247,0.6)]">
                S
              </div>
              <h2 className="text-xl font-extrabold text-white">Satori v2.4.0</h2>
              <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                Next-generation, all-in-one streaming and reading platform for Anime, Manga, and Light Novels.
              </p>
              <div className="p-4 bg-[#14141E] rounded-2xl border border-white/5 text-left text-xs space-y-2 text-white/70">
                <p>• Fast dynamic API integrations with AniList, MangaDex & Consumet</p>
                <p>• Zero hardcoded data, real-time reactive updates</p>
                <p>• OLED Dark & 9 Custom Accent Color Palettes</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Settings Main Hub */
        <>
          <div className="mb-4">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
              Settings
            </h1>
          </div>

          <div className="space-y-2.5">
            {sections.map((sec) => (
              <div
                key={sec.id}
                onClick={() => setSettingsSubPage(sec.id)}
                className="flex items-center gap-3.5 p-4 bg-[#13131D] rounded-2xl border border-white/5 hover:border-purple-500/40 hover:bg-[#181826] transition-all cursor-pointer shadow-lg"
              >
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                  {sec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">{sec.title}</h3>
                  <p className="text-xs text-white/50 line-clamp-1 mt-0.5">{sec.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

// Helper Subcomponents for Settings
const SettingCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-4 bg-[#12121A] rounded-2xl border border-white/10 space-y-2.5">
    <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">{title}</label>
    {children}
  </div>
);

const SettingToggle: React.FC<{
  title: string;
  desc: string;
  value: boolean;
  onChange: (val: boolean) => void;
}> = ({ title, desc, value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    className="flex items-center justify-between p-4 bg-[#12121A] rounded-2xl border border-white/10 cursor-pointer hover:border-white/20 transition-all"
  >
    <div className="flex-1 pr-4">
      <h4 className="text-xs sm:text-sm font-bold text-white">{title}</h4>
      <p className="text-[11px] text-white/50 mt-0.5">{desc}</p>
    </div>
    <div
      className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
        value ? 'bg-purple-600' : 'bg-white/20'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </div>
  </div>
);

const SettingSlider: React.FC<{
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}> = ({ title, value, unit, min, max, step, onChange }) => (
  <div className="p-4 bg-[#12121A] rounded-2xl border border-white/10 space-y-2">
    <div className="flex justify-between items-center text-xs font-bold">
      <span className="text-white/70 uppercase">{title}</span>
      <span className="text-purple-400 font-mono font-extrabold">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
    />
  </div>
);
