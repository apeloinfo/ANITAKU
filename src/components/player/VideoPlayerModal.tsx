import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  Lock,
  Unlock,
  Keyboard,
  LayoutGrid,
  Grid2X2,
  Gauge,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Tv,
  Server,
  Subtitles,
  Search,
  RotateCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Hls from 'hls.js';
import { useApp } from '../../context/AppContext';
import { fetchMediaEpisodes } from '../../services/apiClient';
import { resolveStreamWithFallbacks, ResolvedStreamPayload } from '../../services/streamResolver';
import { EpisodeItem } from '../../types';

type ActiveDrawer = 'subtitles' | 'episodes' | 'quality' | 'speed' | null;

export const VideoPlayerModal: React.FC = () => {
  const {
    activeVideoEpisode,
    setActiveVideoEpisode,
    settings,
    updateLibraryProgress,
    showToast,
  } = useApp();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isForcedLandscape, setIsForcedLandscape] = useState(false);

  // Drawers state
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [episodeGridColumns, setEpisodeGridColumns] = useState<2 | 4>(4);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');

  // Audio, Subtitle, Speed, Quality
  const [audioTrack, setAudioTrack] = useState<'sub' | 'dub'>('sub');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('English');
  const [playbackSpeed, setPlaybackSpeed] = useState<string>(settings.playbackSpeed || '1.00x');
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['Auto', '1080p', '720p', '480p', '360p']);
  const [selectedServer, setSelectedServer] = useState<string>('Default (Anify HLS CDN)');
  const [ambientLightEnabled, setAmbientLightEnabled] = useState<boolean>(settings.ambientLight || false);

  // Stream data from resolver
  const [streamData, setStreamData] = useState<ResolvedStreamPayload | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [liveEpisodes, setLiveEpisodes] = useState<EpisodeItem[]>([]);

  // Update library progress when opening episode
  useEffect(() => {
    if (activeVideoEpisode) {
      updateLibraryProgress(activeVideoEpisode.media.id, activeVideoEpisode.episodeNumber);
    }
  }, [activeVideoEpisode?.media.id, activeVideoEpisode?.episodeNumber]);

  // Load real aired episodes
  useEffect(() => {
    let isCancelled = false;
    async function loadEpisodes() {
      if (!activeVideoEpisode?.media) return;
      try {
        const eps = await fetchMediaEpisodes(activeVideoEpisode.media);
        if (!isCancelled && eps.length > 0) {
          setLiveEpisodes(eps);
        }
      } catch (err) {
        console.warn('Failed to fetch aired episodes:', err);
      }
    }
    loadEpisodes();
    return () => {
      isCancelled = true;
    };
  }, [activeVideoEpisode?.media?.id]);

  // Auto-request landscape fullscreen on open (mimics YouTube mobile behavior)
  useEffect(() => {
    const triggerLandscapeMode = async () => {
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen().catch(() => {});
        }
        // Attempt screen orientation lock if available in browser
        if (window.screen && 'orientation' in window.screen) {
          const orientation = (window.screen.orientation as any);
          if (orientation && typeof orientation.lock === 'function') {
            await orientation.lock('landscape').catch(() => {});
          }
        }
      } catch {
        // Safe fallback
      }
    };

    triggerLandscapeMode();

    return () => {
      try {
        if (window.screen && 'orientation' in window.screen) {
          const orientation = (window.screen.orientation as any);
          if (orientation && typeof orientation.unlock === 'function') {
            orientation.unlock();
          }
        }
      } catch {}
    };
  }, []);

  // Fetch real stream sources with guaranteed fallback
  useEffect(() => {
    let isCancelled = false;

    async function loadStream() {
      if (!activeVideoEpisode) return;
      setIsLoadingStream(true);
      setStreamError(null);
      setStreamData(null);
      setActiveSourceIndex(0);
      setCurrentTime(0);

      try {
        const data = await resolveStreamWithFallbacks(
          activeVideoEpisode.media.id,
          activeVideoEpisode.episodeNumber,
          activeVideoEpisode.media.title,
          audioTrack
        );

        if (isCancelled) return;

        if (data && data.sources && data.sources.length > 0) {
          setStreamData(data);
          
          // Seed qualities from returned source items if discrete manifests are provided
          const distinctQualities = new Set<string>(['Auto']);
          data.sources.forEach((s) => {
            if (s.quality && s.quality.toLowerCase() !== 'default') {
              const qStr = s.quality.toLowerCase().includes('p') || s.quality.toLowerCase() === 'auto'
                ? s.quality
                : `${s.quality}p`;
              distinctQualities.add(qStr);
            }
          });
          if (distinctQualities.size > 1) {
            setAvailableQualities(Array.from(distinctQualities));
          }
        } else {
          setStreamError(`No streaming sources found for Episode ${activeVideoEpisode.episodeNumber}.`);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setStreamError(err?.message || 'Failed to resolve stream source.');
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

  // Mount video source and initialize HLS.js engine with manifest switching
  useEffect(() => {
    if (!videoRef.current || !streamData || streamData.sources.length === 0) return;

    const video = videoRef.current;
    const currentSources = streamData.sources;
    const safeIndex = Math.min(activeSourceIndex, currentSources.length - 1);
    
    // Check if there is an exact manifest URL corresponding to the selected quality
    const matchingSource =
      selectedQuality !== 'Auto'
        ? currentSources.find((s) => s.quality.toLowerCase().replace('p', '') === selectedQuality.toLowerCase().replace('p', ''))
        : null;

    const activeSource = matchingSource || currentSources[safeIndex] || currentSources[0];
    const streamUrl = activeSource.url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryNextFallback = () => {
      if (activeSourceIndex < currentSources.length - 1) {
        console.warn(`Stream source ${activeSourceIndex} failed, attempting fallback ${activeSourceIndex + 1}...`);
        setActiveSourceIndex((prev) => prev + 1);
        showToast('Switching to secondary video mirror...');
      } else {
        setStreamError('All streaming mirrors encountered playback errors.');
      }
    };

    if (Hls.isSupported() && (activeSource.isM3U8 || streamUrl.includes('.m3u8'))) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        capLevelToPlayerSize: false,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferLength: 30,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // Extract dynamically available bitrate levels from master HLS playlist
        if (data.levels && data.levels.length > 0) {
          const parsedQualities = ['Auto', ...data.levels.map((lvl) => `${lvl.height}p`)];
          const uniqueQualities = Array.from(new Set(parsedQualities)).sort((a, b) => {
            if (a === 'Auto') return -1;
            if (b === 'Auto') return 1;
            return parseInt(b) - parseInt(a);
          });
          setAvailableQualities(uniqueQualities);

          // Apply selected quality level
          if (selectedQuality === 'Auto') {
            hls.currentLevel = -1; // Auto ABR
          } else {
            const targetHeight = parseInt(selectedQuality.replace('p', ''));
            const targetLevelIndex = data.levels.findIndex((lvl) => lvl.height === targetHeight);
            if (targetLevelIndex !== -1) {
              hls.currentLevel = targetLevelIndex;
            }
          }
        }

        // Restore playback position if switching resolutions
        if (currentTime > 0) {
          video.currentTime = currentTime;
        }

        video.play().catch(() => {});
        setIsPlaying(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error in HLS, attempting recovery...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error in HLS, attempting recovery...', data);
              hls.recoverMediaError();
              break;
            default:
              console.warn('Unrecoverable HLS stream error:', data);
              tryNextFallback();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !streamUrl.includes('.m3u8')) {
      // Native HLS support (e.g. Safari on iOS / macOS) or direct MP4 stream
      video.src = streamUrl;
      if (currentTime > 0) {
        video.currentTime = currentTime;
      }
      video.onerror = () => {
        tryNextFallback();
      };
      video.play().catch(() => {});
      setIsPlaying(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamData, selectedQuality, activeSourceIndex]);

  // Handle dynamic resolution level change directly on active HLS instance
  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    showToast(`Quality: ${quality}`);

    if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
      if (quality === 'Auto') {
        hlsRef.current.currentLevel = -1; // Adaptive Bitrate
      } else {
        const targetHeight = parseInt(quality.replace('p', ''));
        const levelIdx = hlsRef.current.levels.findIndex((lvl) => lvl.height === targetHeight);
        if (levelIdx !== -1) {
          hlsRef.current.currentLevel = levelIdx;
        }
      }
    }
  };

  // Sync volume, mute & speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      const speedNum = parseFloat(playbackSpeed.replace('x', '')) || 1.0;
      videoRef.current.playbackRate = speedNum;
    }
  }, [volume, isMuted, playbackSpeed]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Controls auto-hide timer (3 seconds)
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeDrawer) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, activeDrawer]);

  const handleScreenTap = () => {
    if (isLocked) {
      setShowUnlockPrompt(true);
      setTimeout(() => setShowUnlockPrompt(false), 3000);
      return;
    }

    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimer();
    }
  };

  const togglePlay = () => {
    if (isLocked) return;
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
    resetControlsTimer();
  };

  const handleSeek = (newTime: number) => {
    if (isLocked) return;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    resetControlsTimer();
  };

  const handleRewind10 = () => {
    if (isLocked) return;
    handleSeek(Math.max(currentTime - 10, 0));
    showToast('-10s');
  };

  const handleForward10 = () => {
    if (isLocked) return;
    handleSeek(Math.min(currentTime + 10, duration || 1440));
    showToast('+10s');
  };

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, isNaN(secs) ? 0 : secs);
    const m = Math.floor(safeSecs / 60);
    const s = Math.floor(safeSecs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic Intro / Outro calculation
  const introDuration = streamData?.intro
    ? Math.max(10, Math.round(streamData.intro.end - streamData.intro.start))
    : 85;

  const isWithinIntro =
    streamData?.intro && currentTime >= streamData.intro.start && currentTime < streamData.intro.end;

  const isWithinOutro =
    streamData?.outro && currentTime >= streamData.outro.start && currentTime < streamData.outro.end;

  const dynamicSkipLabel = isWithinOutro
    ? 'Skip Outro'
    : isWithinIntro
    ? 'Skip Intro'
    : `+${introDuration}s`;

  const handleDynamicSkip = () => {
    if (isLocked) return;
    if (isWithinIntro && streamData?.intro) {
      handleSeek(streamData.intro.end);
      showToast('Skipped Intro');
    } else if (isWithinOutro && streamData?.outro) {
      handleSeek(streamData.outro.end);
      showToast('Skipped Outro');
    } else {
      handleSeek(Math.min(currentTime + introDuration, duration || 1440));
      showToast(`Skipped +${introDuration}s`);
    }
  };

  const toggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (nextLocked) {
      setShowControls(false);
      setActiveDrawer(null);
      showToast('Screen Locked');
    } else {
      setShowControls(true);
      showToast('Screen Unlocked');
      resetControlsTimer();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        if (window.screen && 'orientation' in window.screen) {
          const orientation = (window.screen.orientation as any);
          if (orientation && typeof orientation.lock === 'function') {
            await orientation.lock('landscape').catch(() => {});
          }
        }
      } else {
        await document.exitFullscreen();
        if (window.screen && 'orientation' in window.screen) {
          const orientation = (window.screen.orientation as any);
          if (orientation && typeof orientation.unlock === 'function') {
            orientation.unlock();
          }
        }
      }
    } catch {
      // Toggle CSS landscape rotation fallback if native lock is prevented in iframe
      setIsForcedLandscape(!isForcedLandscape);
    }
  };

  const toggleLandscapeRotation = () => {
    setIsForcedLandscape(!isForcedLandscape);
    showToast(isForcedLandscape ? 'Portrait Mode' : 'Landscape Mode (Rotated)');
  };

  if (!activeVideoEpisode) return null;

  const { media, episodeNumber } = activeVideoEpisode;
  const maxLiveEpisode =
    liveEpisodes.length > 0
      ? Math.max(...liveEpisodes.map((e) => e.number))
      : media.latestEpisode || media.totalEpisodes || 24;
  const totalEpisodeCount = liveEpisodes.length > 0 ? liveEpisodes.length : maxLiveEpisode;

  // Filtered episodes for drawer
  const filteredEpisodes = (liveEpisodes.length > 0
    ? liveEpisodes
    : Array.from({ length: totalEpisodeCount }, (_, i) => ({
        id: `ep-${i + 1}`,
        number: i + 1,
        title: `Episode ${i + 1}`,
      }))
  ).filter((ep) =>
    episodeSearchQuery
      ? String(ep.number).includes(episodeSearchQuery) ||
        (ep.title && ep.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()))
      : true
  );

  const speedOptions = [
    '0.25x',
    '0.50x',
    '0.75x',
    '1.00x',
    '1.25x',
    '1.50x',
    '1.75x',
    '2.00x',
    '2.25x',
    '2.75x',
    '3.00x',
  ];

  const qualityOptions = ['Auto', '1080p', '720p', '480p', '360p'];
  const serverOptions = ['VidSrc HD (Server 1)', 'AutoEmbed (Server 2)', 'SmashyStream (Server 3)', 'VidSrc Me (Server 4)', '2Embed (Server 5)', 'MultiEmbed (Server 6)'];

  const isEmbedMode = Boolean(
    streamData?.sources[activeSourceIndex]?.isEmbed ||
      (streamData?.sources[0]?.isEmbed &&
        (!streamData?.sources[activeSourceIndex] || streamData?.sources[activeSourceIndex]?.isEmbed))
  );

  const currentEmbedUrl =
    streamData?.sources[activeSourceIndex]?.url ||
    streamData?.sources[0]?.url ||
    streamData?.embedUrl ||
    '';

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onClick={!isEmbedMode ? handleScreenTap : undefined}
      className={`fixed inset-0 z-[5000] bg-black flex flex-col justify-between overflow-hidden select-none ${
        isForcedLandscape
          ? 'rotate-90 origin-top-left w-[100vh] h-[100vw] translate-x-full'
          : ''
      }`}
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
            <p className="text-sm font-semibold text-white/80">Connecting Live Anime Stream...</p>
            <span className="text-xs text-white/40">Querying real multi-provider mirrors</span>
          </div>
        ) : streamError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 z-10 bg-[#181a22]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Stream Unavailable</h3>
              <p className="text-xs text-white/60">{streamError}</p>
            </div>
            <button
              onClick={() => {
                setStreamError(null);
                setIsLoadingStream(true);
                if (activeVideoEpisode) {
                  setActiveVideoEpisode({ ...activeVideoEpisode });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        ) : isEmbedMode ? (
          /* Live Real Anime Embed Frame */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <iframe
              src={currentEmbedUrl}
              title={`${media.title} Episode ${episodeNumber}`}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              playsInline
              autoPlay
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onEnded={() => {
                if (episodeNumber < maxLiveEpisode) {
                  setActiveVideoEpisode({ media, episodeNumber: episodeNumber + 1 });
                  showToast(`Playing Episode ${episodeNumber + 1}`);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              {streamData?.subtitles
                ?.filter((sub) => Boolean(sub.url && typeof sub.url === 'string' && sub.url.trim() !== ''))
                ?.map((sub, idx) => (
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
          </div>
        )}
      </div>

      {/* LOCK SCREEN UNLOCK PROMPT (Visible when locked & user taps screen) */}
      {!isEmbedMode && isLocked && (
        <div
          className={`absolute bottom-6 left-6 z-50 transition-opacity duration-200 ${
            showUnlockPrompt ? 'opacity-100' : 'opacity-40 hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={toggleLock}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#181a22]/90 border border-purple-500/40 text-purple-300 backdrop-blur-md shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span className="text-xs font-bold">Tap to Unlock Screen</span>
          </button>
        </div>
      )}

      {/* 2. TOP OVERLAY HEADER */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-20 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-5 bg-gradient-to-b from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          showControls && !isLocked ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Back Button + Title/Episode Metadata */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveVideoEpisode(null)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#181a22]/90 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white cursor-pointer shadow-lg transition-all active:scale-95 shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white leading-tight tracking-tight drop-shadow-md truncate">
              Episode {episodeNumber}
            </h1>
            <p className="text-xs text-white/70 font-medium truncate leading-tight mt-0.5 drop-shadow-sm max-w-[180px] sm:max-w-xs">
              {media.title}
            </p>
          </div>
        </div>

        {/* Server Switcher Badges / Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Server Mirror Buttons */}
          {streamData?.sources && streamData.sources.length > 1 && (
            <div className="hidden md:flex items-center gap-1.5 p-1 bg-[#181a22]/90 border border-white/10 rounded-full">
              {streamData.sources.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSourceIndex(idx);
                    showToast(`Switched to ${s.server || `Server ${idx + 1}`}`);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    activeSourceIndex === idx
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.server ? s.server.split('(')[0].trim() : `Server ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Audio SUB / DUB Toggle */}
          <button
            onClick={() => {
              const nextAudio = audioTrack === 'sub' ? 'dub' : 'sub';
              setAudioTrack(nextAudio);
              showToast(`Switched Audio: ${nextAudio.toUpperCase()}`);
            }}
            className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md border border-purple-400/40 transition-all cursor-pointer active:scale-95"
          >
            {audioTrack}
          </button>

          {/* Episode Switcher Drawer */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'episodes' ? null : 'episodes')}
            className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              activeDrawer === 'episodes'
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-[#181a22]/80 text-white/70 border-white/10 hover:text-white'
            }`}
            title="Episode List"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Server / Quality Drawer */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'quality' ? null : 'quality')}
            className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              activeDrawer === 'quality'
                ? 'bg-purple-600 text-white border-purple-400'
                : 'bg-[#181a22]/80 text-white/70 border-white/10 hover:text-white'
            }`}
            title="Streaming Servers & Mirror List"
          >
            <Server className="w-4 h-4" />
          </button>

          {/* Open in External Tab / Dedicated Window */}
          {currentEmbedUrl && (
            <button
              onClick={() => {
                window.open(currentEmbedUrl, '_blank');
              }}
              className="p-2 rounded-full border bg-[#181a22]/80 text-white/70 border-white/10 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
              title="Open stream in a new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {/* Direct Popout / Open in New Tab Button */}
          {currentEmbedUrl && (
            <button
              onClick={() => {
                window.open(currentEmbedUrl, '_blank', 'noopener,noreferrer');
                showToast('Opened live stream in full window');
              }}
              className="p-2 rounded-full bg-[#181a22]/80 text-white/70 border border-white/10 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Open Stream in Direct Window"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          {/* Quick Rotate Screen Toggle */}
          <button
            onClick={toggleLandscapeRotation}
            className={`w-9 h-9 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              isForcedLandscape
                ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'bg-[#181a22]/80 text-white/70 border-white/10 hover:text-white'
            }`}
            title="Rotate Screen (Landscape / Portrait)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. CENTER PLAYBACK CONTROLS (Floating -10s, Play/Pause, +10s) - Only for native video */}
      {!isEmbedMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
            showControls && !isLocked ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-8 sm:gap-14 pointer-events-auto select-none">
            {/* -10s Rewind Button */}
            <button
              onClick={handleRewind10}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:scale-110 active:scale-90 transition-all cursor-pointer"
              aria-label="Rewind 10 seconds"
            >
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <text
                  x="12"
                  y="15.5"
                  fontSize="7.5"
                  fontWeight="900"
                  textAnchor="middle"
                  fill="currentColor"
                  stroke="none"
                >
                  10
                </text>
              </svg>
            </button>

            {/* Dynamic Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all cursor-pointer drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-9 h-9 sm:w-11 sm:h-11 fill-current" />
              ) : (
                <Play className="w-9 h-9 sm:w-11 sm:h-11 fill-current ml-1" />
              )}
            </button>

            {/* +10s Forward Button */}
            <button
              onClick={handleForward10}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:scale-110 active:scale-90 transition-all cursor-pointer"
              aria-label="Forward 10 seconds"
            >
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <text
                  x="12"
                  y="15.5"
                  fontSize="7.5"
                  fontWeight="900"
                  textAnchor="middle"
                  fill="currentColor"
                  stroke="none"
                >
                  10
                </text>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 4. TIMELINE & FLOATING BADGES & BOTTOM NAVIGATION TOOLBAR - Only for native video */}
      {!isEmbedMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative z-20 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3 transition-opacity duration-300 ${
            showControls && !isLocked ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* A. FLOATING BADGES (Above Timeline) */}
          <div className="flex items-center justify-between">
            {/* Left Badges: Lock Screen & Audio SUB/DUB Pill */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleLock}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Lock Screen"
              >
                <Lock className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  const nextAudio = audioTrack === 'sub' ? 'dub' : 'sub';
                  setAudioTrack(nextAudio);
                  showToast(`Switched Audio: ${nextAudio.toUpperCase()}`);
                }}
                className="px-3.5 py-1 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-purple-400/40 transition-all cursor-pointer active:scale-95"
              >
                {audioTrack}
              </button>
            </div>

            {/* Right Floating Badge: Dynamic Skip Intro/Outro (+85s) */}
            <button
              onClick={handleDynamicSkip}
              className="px-4 py-1.5 rounded-full bg-[#181a22]/90 hover:bg-[#222530] border border-white/15 text-white font-bold text-xs shadow-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>{dynamicSkipLabel}</span>
            </button>
          </div>

          {/* B. TIMELINE PROGRESS SCRUBBER */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/90 font-mono tracking-tight shrink-0">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#a855f7] focus:outline-none"
              />
            </div>

            <span className="text-xs font-bold text-white/90 font-mono tracking-tight shrink-0">
              {formatTime(duration || 0)}
            </span>
          </div>

          {/* C. BOTTOM NAVIGATION TOOLBAR (Left & Right Capsules) */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 p-1.5 bg-[#181a22]/90 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
              <button
                onClick={() => setActiveDrawer(activeDrawer === 'subtitles' ? null : 'subtitles')}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeDrawer === 'subtitles' ? 'bg-purple-600 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Subtitles & Audio"
              >
                <Keyboard className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveDrawer(activeDrawer === 'episodes' ? null : 'episodes')}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeDrawer === 'episodes' ? 'bg-purple-600 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Episode List"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-[#181a22]/90 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
              <button
                onClick={() => setActiveDrawer(activeDrawer === 'quality' ? null : 'quality')}
                className={`px-2.5 py-2 rounded-xl transition-colors cursor-pointer font-black text-xs flex items-center justify-center ${
                  activeDrawer === 'quality' ? 'bg-purple-600 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Stream Quality & Server"
              >
                <span className="border border-current px-1 py-0.5 rounded leading-none text-[10px] tracking-wider">
                  HD
                </span>
              </button>

              <button
                onClick={() => setActiveDrawer(activeDrawer === 'speed' ? null : 'speed')}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeDrawer === 'speed' ? 'bg-purple-600 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Playback Speed"
              >
                <Gauge className="w-5 h-5" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL BOTTOM DRAWERS / SHEETS */}

      {/* DRAWER 1: SUBTITLES & AUDIO */}
      {activeDrawer === 'subtitles' && (
        <div
          onClick={() => setActiveDrawer(null)}
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] bg-[#12141c] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 overflow-y-auto space-y-5 text-white shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-purple-400" />
                <span>Audio & Subtitle Tracks</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Track Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Audio Track</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setAudioTrack('sub');
                    showToast('Audio set to Japanese (Sub)');
                  }}
                  className={`py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    audioTrack === 'sub'
                      ? 'bg-purple-600 text-white shadow-lg border border-purple-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  <span>Sub (Japanese Audio)</span>
                </button>

                <button
                  onClick={() => {
                    setAudioTrack('dub');
                    showToast('Audio set to English (Dub)');
                  }}
                  className={`py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    audioTrack === 'dub'
                      ? 'bg-purple-600 text-white shadow-lg border border-purple-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Dub (English Audio)</span>
                </button>
              </div>
            </div>

            {/* Subtitle Tracks */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Subtitle Tracks</label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
                {streamData?.subtitles && streamData.subtitles.length > 0 ? (
                  streamData.subtitles.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubtitle(sub.lang);
                        showToast(`Subtitles: ${sub.label || sub.lang}`);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedSubtitle === sub.lang
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Subtitles className="w-4 h-4 text-purple-400" />
                        <span>{sub.label || sub.lang}</span>
                      </div>
                      {selectedSubtitle === sub.lang && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  ))
                ) : (
                  ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Off'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedSubtitle(lang);
                        showToast(`Subtitles: ${lang}`);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedSubtitle === lang
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{lang}</span>
                      {selectedSubtitle === lang && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 2: EPISODE LIST DRAWER */}
      {activeDrawer === 'episodes' && (
        <div
          onClick={() => setActiveDrawer(null)}
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] bg-[#12141c] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 overflow-y-auto space-y-4 text-white shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            {/* Header with Title and Grid Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-purple-400" />
                  <span>Episodes ({totalEpisodeCount})</span>
                </h3>
                <p className="text-xs text-white/50">{media.title}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* 2-Grid vs 4-Grid Toggle */}
                <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
                  <button
                    onClick={() => setEpisodeGridColumns(2)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      episodeGridColumns === 2 ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                    title="2 Column Grid"
                  >
                    <Grid2X2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEpisodeGridColumns(4)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      episodeGridColumns === 4 ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                    title="4 Column Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={episodeSearchQuery}
                onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                placeholder="Search episode number..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Grid List */}
            <div
              className={`grid gap-2 max-h-96 overflow-y-auto no-scrollbar pt-1 ${
                episodeGridColumns === 2 ? 'grid-cols-2' : 'grid-cols-4'
              }`}
            >
              {filteredEpisodes.map((ep) => {
                const isCurrent = episodeNumber === ep.number;
                return (
                  <button
                    key={ep.id || ep.number}
                    onClick={() => {
                      setActiveVideoEpisode({ media, episodeNumber: ep.number });
                      setActiveDrawer(null);
                      showToast(`Playing Episode ${ep.number}`);
                    }}
                    className={`p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-purple-600 text-white shadow-lg border border-purple-400'
                        : 'bg-white/5 hover:bg-white/15 text-white/80 border border-white/5'
                    } ${episodeGridColumns === 2 ? 'aspect-[16/9]' : 'aspect-square'}`}
                  >
                    <span className="font-mono text-sm sm:text-base font-black">
                      Ep {ep.number}
                    </span>
                    {('filler' in ep ? ep.filler : false) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold uppercase">
                        Filler
                      </span>
                    )}
                    {episodeGridColumns === 2 && ep.title && (
                      <span className="text-[10px] text-white/60 line-clamp-1 text-center">
                        {ep.title}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 3: QUALITY & SERVER DRAWER */}
      {activeDrawer === 'quality' && (
        <div
          onClick={() => setActiveDrawer(null)}
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12141c] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 overflow-y-auto space-y-5 text-white shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Stream Quality & Server</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quality Resolution Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Stream Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedQuality.toLowerCase() === q.toLowerCase()
                        ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Mirror Provider */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase">Streaming Server Mirror</label>
              <div className="space-y-1.5">
                {(streamData?.sources && streamData.sources.length > 0
                  ? streamData.sources
                  : serverOptions.map((s) => ({ server: s, url: '', quality: 'Auto' }))
                ).map((src: any, idx: number) => {
                  const srvName = src.server || `Mirror Server ${idx + 1}`;
                  const isSelected = activeSourceIndex === idx;
                  return (
                    <button
                      key={`${srvName}-${idx}`}
                      onClick={() => {
                        setActiveSourceIndex(idx);
                        setSelectedServer(srvName);
                        showToast(`Switched to ${srvName}`);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-purple-400" />
                        <span>{srvName}</span>
                        {src.quality && <span className="text-[10px] text-white/40">({src.quality})</span>}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 4: PLAYBACK SPEED DRAWER */}
      {activeDrawer === 'speed' && (
        <div
          onClick={() => setActiveDrawer(null)}
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12141c] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 overflow-y-auto space-y-5 text-white shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>Playback Speed ({playbackSpeed})</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Speed Pills */}
            <div className="grid grid-cols-4 gap-2">
              {speedOptions.map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    setPlaybackSpeed(spd);
                    showToast(`Speed: ${spd}`);
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
