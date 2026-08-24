import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings as SettingsIcon,
  Sparkles,
  List,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Hls from 'hls.js';
import { useApp } from '../../context/AppContext';
import { getAnimeStreamSources, AnifyStreamData } from '../../services/apiClient';

export const VideoPlayerModal: React.FC = () => {
  const {
    activeVideoEpisode,
    setActiveVideoEpisode,
    settings,
    updateLibraryProgress,
    showToast,
  } = useApp();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);

  // Playback settings
  const [playbackSpeed, setPlaybackSpeed] = useState(settings.playbackSpeed || '1x');
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [audioTrack, setAudioTrack] = useState<'sub' | 'dub'>('sub');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('English');
  const [ambientLightEnabled, setAmbientLightEnabled] = useState(settings.ambientLight || false);

  // Stream state from Anify
  const [streamData, setStreamData] = useState<AnifyStreamData | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Update library progress when opening episode
  useEffect(() => {
    if (activeVideoEpisode) {
      updateLibraryProgress(activeVideoEpisode.media.id, activeVideoEpisode.episodeNumber);
    }
  }, [activeVideoEpisode?.media.id, activeVideoEpisode?.episodeNumber]);

  // Fetch real stream sources via Anify API
  useEffect(() => {
    let isCancelled = false;

    async function loadStream() {
      if (!activeVideoEpisode) return;
      setIsLoadingStream(true);
      setStreamError(null);
      setStreamData(null);
      setCurrentTime(0);

      try {
        const data = await getAnimeStreamSources(
          activeVideoEpisode.media.id,
          activeVideoEpisode.episodeNumber,
          {
            title: activeVideoEpisode.media.title,
            subType: audioTrack,
          }
        );

        if (isCancelled) return;

        if (data && data.sources && data.sources.length > 0) {
          setStreamData(data);
        } else {
          setStreamError(`No streaming sources found for Episode ${activeVideoEpisode.episodeNumber} via Anify.`);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setStreamError(err?.message || 'Failed to resolve stream source from Anify API.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStream(false);
        }
      }
    }

    loadStream();

    return () => {
      isCancelled = true;
    };
  }, [activeVideoEpisode?.media?.id, activeVideoEpisode?.episodeNumber, audioTrack]);

  // Mount video source / HLS stream
  useEffect(() => {
    if (!videoRef.current || !streamData || streamData.sources.length === 0) return;

    const video = videoRef.current;
    const activeSource =
      streamData.sources.find((s) => s.quality === selectedQuality) ||
      streamData.sources[0];

    const streamUrl = activeSource.url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && (activeSource.isM3U8 || streamUrl.includes('.m3u8'))) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setIsPlaying(true);
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS stream error:', data);
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !streamUrl.includes('.m3u8')) {
      video.src = streamUrl;
      video.play().catch(() => {});
      setIsPlaying(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamData, selectedQuality]);

  // Sync volume, mute & speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      const speedNum = parseFloat(playbackSpeed.replace('x', '')) || 1.0;
      videoRef.current.playbackRate = speedNum;
    }
  }, [volume, isMuted, playbackSpeed]);

  if (!activeVideoEpisode) return null;

  const { media, episodeNumber } = activeVideoEpisode;
  const totalEpisodes = media.totalEpisodes || media.latestEpisode || 24;

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 4000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSkipIntro = () => {
    const introEnd = streamData?.intro?.end || currentTime + 85;
    handleSeek(Math.min(introEnd, duration || 1440));
    showToast('Skipped Opening');
  };

  const handleSkipFiller = () => {
    handleSeek(Math.min(currentTime + 120, duration || 1440));
    showToast('Skipped (+120s)');
  };

  const handleNextEpisode = () => {
    if (episodeNumber < totalEpisodes) {
      setActiveVideoEpisode({ media, episodeNumber: episodeNumber + 1 });
      showToast(`Playing Episode ${episodeNumber + 1}`);
    } else {
      showToast('You are on the latest episode');
    }
  };

  const handlePrevEpisode = () => {
    if (episodeNumber > 1) {
      setActiveVideoEpisode({ media, episodeNumber: episodeNumber - 1 });
      showToast(`Playing Episode ${episodeNumber - 1}`);
    }
  };

  const handleRetryStream = () => {
    if (activeVideoEpisode) {
      setActiveVideoEpisode({ ...activeVideoEpisode });
    }
  };

  return (
    <div
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className="fixed inset-0 z-[5000] bg-black flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Ambient Glow Background Effect */}
      {ambientLightEnabled && (
        <div className="absolute inset-0 pointer-events-none opacity-40 blur-3xl scale-125 bg-gradient-to-tr from-purple-700/50 via-blue-700/40 to-cyan-500/50" />
      )}

      {/* 1. VIDEO SURFACE STAGE */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#07070A]">
        {isLoadingStream ? (
          <div className="flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-sm font-medium text-white/80">Resolving Anify HLS stream sources...</p>
          </div>
        ) : streamError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 z-10">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Stream Unavailable</h3>
              <p className="text-xs text-white/60">{streamError}</p>
            </div>
            <button
              onClick={handleRetryStream}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onEnded={handleNextEpisode}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              {streamData?.subtitles?.map((sub, idx) => (
                <track
                  key={idx}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang}
                  label={sub.label || sub.lang}
                  default={sub.default}
                />
              ))}
            </video>

            {/* Center Play indicator if paused */}
            {!isPlaying && showControls && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute p-6 rounded-full bg-purple-600/90 text-white shadow-[0_0_40px_rgba(168,85,247,0.8)] border border-white/20 hover:scale-110 transition-transform cursor-pointer"
              >
                <Play className="w-10 h-10 fill-current ml-1" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. TOP OVERLAY HEADER */}
      <div
        className={`relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveVideoEpisode(null)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">{media.title}</h2>
            <p className="text-xs text-purple-300 font-medium">
              Episode {episodeNumber}
              {streamData?.providerId && ` · Provider: ${streamData.providerId}`}
            </p>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {/* Ambient light toggle */}
          <button
            onClick={() => {
              setAmbientLightEnabled(!ambientLightEnabled);
              showToast(ambientLightEnabled ? 'Ambient Light off' : 'Ambient Light on');
            }}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              ambientLightEnabled
                ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'bg-white/10 text-white/70 border-white/10 hover:text-white'
            }`}
            title="Toggle Ambient Glow"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Episode Drawer toggle */}
          <button
            onClick={() => setShowEpisodeDrawer(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white cursor-pointer"
            title="Episode List"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Settings Drawer toggle */}
          <button
            onClick={() => setShowSettingsDrawer(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white cursor-pointer"
            title="Player Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. CENTER / QUICK ACTION BUTTONS */}
      <div
        className={`relative z-20 flex items-center justify-between px-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex gap-2">
          <button
            onClick={handleSkipIntro}
            className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            Skip Intro (+85s)
          </button>
          <button
            onClick={handleSkipFiller}
            className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/80 hover:bg-white/20 text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            Skip Filler
          </button>
        </div>
      </div>

      {/* 4. BOTTOM CONTROLS & TIMELINE SCRUBBER */}
      <div
        className={`relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar / Scrubber */}
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Prev Ep */}
            <button
              onClick={handlePrevEpisode}
              disabled={episodeNumber <= 1}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* 10s Rewind */}
            <button
              onClick={() => handleSeek(Math.max(currentTime - 10, 0))}
              className="p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 10s Forward */}
            <button
              onClick={() => handleSeek(Math.min(currentTime + 10, duration || 1440))}
              className="p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Next Ep */}
            <button
              onClick={handleNextEpisode}
              disabled={episodeNumber >= totalEpisodes}
              className="p-1.5 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time Stamp */}
            <span className="text-xs font-mono text-white/80 pl-2">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Track (Sub / Dub) Toggle */}
            <button
              onClick={() => {
                const nextType = audioTrack === 'sub' ? 'dub' : 'sub';
                setAudioTrack(nextType);
                showToast(`Switched to ${nextType.toUpperCase()}`);
              }}
              className="px-2.5 py-1 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold hover:bg-purple-600/50 transition-all cursor-pointer uppercase"
            >
              {audioTrack}
            </button>

            {/* Quality badge */}
            <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-bold text-white/80">
              {selectedQuality}
            </span>

            {/* Speed badge */}
            <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-bold text-white/80">
              {playbackSpeed}
            </span>

            {/* Volume */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-white/70 hover:text-white cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 5. PLAYER SETTINGS DRAWER */}
      {showSettingsDrawer && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm h-full bg-[#111118] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Player Settings</h3>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Quality */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {['auto', '1080p', '720p', '480p', '360p'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSelectedQuality(q);
                      showToast(`Quality: ${q}`);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase ${
                      selectedQuality === q
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Playback Speed</label>
              <div className="grid grid-cols-4 gap-2">
                {['0.5x', '0.75x', '1x', '1.25x', '1.5x', '1.75x', '2x'].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      setPlaybackSpeed(spd);
                      showToast(`Speed: ${spd}`);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitles & Audio Track from Anify */}
            {streamData?.subtitles && streamData.subtitles.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase">Available Subtitles</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {streamData.subtitles.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubtitle(sub.lang);
                        showToast(`Subtitles: ${sub.label || sub.lang}`);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedSubtitle === sub.lang
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{sub.label || sub.lang}</span>
                      {selectedSubtitle === sub.lang && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. EPISODE QUICK LIST DRAWER */}
      {showEpisodeDrawer && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm h-full bg-[#111118] border-l border-white/10 p-5 overflow-y-auto space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Episodes ({totalEpisodes})</h3>
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setActiveVideoEpisode({ media, episodeNumber: num });
                    setShowEpisodeDrawer(false);
                    showToast(`Switched to Episode ${num}`);
                  }}
                  className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                    episodeNumber === num
                      ? 'bg-purple-600 text-white shadow-lg border border-purple-400'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
