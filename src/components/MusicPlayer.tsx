import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, VolumeX, ListMusic, Heart, FileText, ChevronUp, Video
} from "lucide-react";
import { Song } from "../types";

interface MusicPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSongClick: (song: Song) => void;
  favorites: string[];
  toggleFavorite: (songId: string) => void;
  queue: Song[];
  setQueue: React.Dispatch<React.SetStateAction<Song[]>>;
  openSongPage: (section?: "lyrics" | "details" | "comments") => void;
  onUpdateYtDuration?: (songId: string, durationSeconds: number) => void;
  ytPlaybackTrigger?: number;
}

export default function MusicPlayer({
  currentSong,
  isPlaying,
  onPlayPauseToggle,
  onNext,
  onPrev,
  onSongClick,
  favorites,
  toggleFavorite,
  queue,
  setQueue,
  openSongPage,
  onUpdateYtDuration,
  ytPlaybackTrigger = 0
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  
  // YouTube player states
  const [showYtScreen, setShowYtScreen] = useState(true);
  const [isYtExpanded, setIsYtExpanded] = useState(false);
  const [isYtApiLoaded, setIsYtApiLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Load YouTube script once if needed
  useEffect(() => {
    if (currentSong?.source === "YouTube") {
      const YT = (window as any).YT;
      if (YT && YT.Player) {
        setIsYtApiLoaded(true);
        return;
      }

      // Check if YouTube API script is already added to prevent duplicate tag errors
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      
      const checkAndSetLoaded = () => {
        const checkYt = (window as any).YT;
        if (checkYt && checkYt.Player) {
          setIsYtApiLoaded(true);
          return true;
        }
        return false;
      };

      if (checkAndSetLoaded()) {
        return;
      }

      // If the script is already present but not fully loaded/ready yet, poll for YT readiness
      if (existingScript) {
        const interval = setInterval(() => {
          if (checkAndSetLoaded()) {
            clearInterval(interval);
          }
        }, 100);
        return () => clearInterval(interval);
      }

      // Register or chain the YouTube ready callback safely
      const previousCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (previousCallback) {
          try { previousCallback(); } catch (e) { console.error("Error in previous YT ready callback:", e); }
        }
        setIsYtApiLoaded(true);
      };

      // Inject the YouTube API script
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, [currentSong]);

  // Pause/cleanup YouTube player when currentSong is not YouTube
  useEffect(() => {
    if (currentSong?.source !== "YouTube") {
      if (ytPlayerRef.current) {
        try {
          if (ytPlayerRef.current.pauseVideo) {
            ytPlayerRef.current.pauseVideo();
          }
        } catch (e) {
          console.error("Error pausing YT player on song switch:", e);
        }
      }
      setShowYtScreen(false);
    }
  }, [currentSong]);

  // Synchronize play state and track source for HTML5 audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (currentSong?.source !== "YouTube") {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleDurationChange = () => {
      if (currentSong?.source !== "YouTube") {
        setTrackDuration(audio.duration || 0);
      }
    };
    const handleEnded = () => {
      if (currentSong?.source !== "YouTube") {
        if (isRepeat) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          onNext();
        }
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isRepeat, onNext, currentSong]);

  // Handle HTML5 Audio song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (currentSong.source === "YouTube") {
      // PLAY SILENT AUDIO in HTML5 audio element on loop so the browser keeps background audio context active!
      const silentAudio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      if (audio.src !== silentAudio) {
        audio.src = silentAudio;
        audio.loop = true;
        audio.load();
      }
      if (isPlaying) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      return; 
    }

    audio.loop = false;
    if (audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
      audio.load();
    }

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentSong, isPlaying]);

  // Handle YouTube Player creation & updates
  useEffect(() => {
    if (!currentSong || currentSong.source !== "YouTube" || !isYtApiLoaded) return;

    let destroyed = false;
    
    // Auto-show screen when a new YouTube song starts or is triggered again
    setShowYtScreen(true);

    const initYtPlayer = () => {
      if (destroyed) return;
      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        setTimeout(initYtPlayer, 100);
        return;
      }

      // Check if div exists. If showYtScreen is false, we can't mount, so keep it visible or mount hidden first
      const container = document.getElementById("youtube-player-div");
      if (!container) {
        setTimeout(initYtPlayer, 100);
        return;
      }

      const iframe = typeof ytPlayerRef.current?.getIframe === "function" ? ytPlayerRef.current.getIframe() : null;
      let loadedOnExisting = false;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function" && iframe && document.body.contains(iframe)) {
        // Just load new video ID
        try {
          if (isPlaying) {
            ytPlayerRef.current.loadVideoById(currentSong.videoId);
          } else {
            ytPlayerRef.current.cueVideoById(currentSong.videoId);
          }
          loadedOnExisting = true;
        } catch (e) {
          console.error("Failed to load video on existing player, recreating:", e);
        }
      }

      if (loadedOnExisting) {
        return;
      }

      // If we got here, we must destroy any existing player and create a new instance
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new YT.Player("youtube-player-div", {
        videoId: currentSong.videoId,
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(isMuted ? 0 : volume * 100);
            if (isPlaying) {
              event.target.playVideo();
            }
            const dur = event.target.getDuration();
            if (dur) {
              setTrackDuration(dur);
              if ((currentSong.duration === "--:--" || !currentSong.duration) && onUpdateYtDuration) {
                onUpdateYtDuration(currentSong.id, dur);
              }
            }
          },
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.ENDED) {
              if (isRepeat) {
                event.target.seekTo(0, true);
                event.target.playVideo();
              } else {
                onNext();
              }
            } else if (event.data === YT.PlayerState.PLAYING) {
              const dur = event.target.getDuration();
              if (dur) {
                setTrackDuration(dur);
                if ((currentSong.duration === "--:--" || !currentSong.duration) && onUpdateYtDuration) {
                  onUpdateYtDuration(currentSong.id, dur);
                }
              }
            }
          }
        }
      });
    };

    initYtPlayer();

    return () => {
      destroyed = true;
    };
  }, [currentSong, isYtApiLoaded, ytPlaybackTrigger]);

  // Synchronize playback of YouTube player when global isPlaying changes
  useEffect(() => {
    if (!currentSong || currentSong.source !== "YouTube" || !ytPlayerRef.current) return;

    try {
      if (isPlaying) {
        if (ytPlayerRef.current.playVideo) ytPlayerRef.current.playVideo();
      } else {
        if (ytPlayerRef.current.pauseVideo) ytPlayerRef.current.pauseVideo();
      }
    } catch (e) {
      console.error("Error toggling YT playback:", e);
    }
  }, [isPlaying, currentSong]);

  // Poll current time for YouTube Player
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentSong?.source === "YouTube" && ytPlayerRef.current) {
      interval = setInterval(() => {
        try {
          if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
            const time = ytPlayerRef.current.getCurrentTime();
            setCurrentTime(time);
          }
        } catch (e) {
          // ignore
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentSong]);

  // Sync Volume to standard Audio and YouTube player
  useEffect(() => {
    if (audioRef.current && currentSong?.source !== "YouTube") {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytPlayerRef.current && currentSong?.source === "YouTube") {
      try {
        if (ytPlayerRef.current.setVolume) {
          ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [volume, isMuted, currentSong]);

  // Media Session API for lock screen controls & background audio metadata
  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;

    try {
      // Set Metadata for mobile lock screen / notifications
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || "Velvet Artist",
        album: "Velveto Frequencies",
        artwork: [
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "96x96", type: "image/jpeg" },
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "128x128", type: "image/jpeg" },
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "192x192", type: "image/jpeg" },
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "256x256", type: "image/jpeg" },
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "384x384", type: "image/jpeg" },
          { src: currentSong.artwork || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=240", sizes: "512x512", type: "image/jpeg" },
        ]
      });

      // Update Playback State so system knows if playing or paused
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // Register Lock Screen / Background event handlers
      navigator.mediaSession.setActionHandler("play", () => {
        onPlayPauseToggle();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        onPlayPauseToggle();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        onPrev();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        onNext();
      });

      // Update seek details in lock screen
      if ("setPositionState" in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: trackDuration || 180,
          playbackRate: 1.0,
          position: currentTime || 0
        });
      }
    } catch (e) {
      console.warn("Media Session API initialization error:", e);
    }

    return () => {
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
          navigator.mediaSession.setActionHandler("previoustrack", null);
          navigator.mediaSession.setActionHandler("nexttrack", null);
        } catch (e) {}
      }
    };
  }, [currentSong, isPlaying, onPlayPauseToggle, onNext, onPrev, trackDuration, currentTime]);

  const handlePlayPause = () => {
    if (!currentSong) return;
    onPlayPauseToggle();
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (currentSong?.source === "YouTube" && ytPlayerRef.current && ytPlayerRef.current.seekTo) {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const removeFromQueue = (index: number) => {
    const updated = [...queue];
    updated.splice(index, 1);
    setQueue(updated);
  };

  if (!currentSong) return null;

  const isFavorited = favorites.includes(currentSong.id);

  return (

    <footer 
      id="velvet-floating-player"
      className="music-player fixed bottom-[64px] md:bottom-0 left-0 right-0 w-full h-16 md:h-24 bg-neutral-950/95 backdrop-blur-3xl border-t border-white/5 z-[9999] px-4 md:px-8 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.9)] group transition-all duration-300"
    >
      {/* 1. CURRENT SONG */}
      <div className="current-song flex items-center gap-2.5 md:gap-3 flex-1 min-w-0 md:w-[30%] md:flex-initial">
        <div 
          id="player-artwork-container"
          className="relative shrink-0 cursor-pointer overflow-hidden rounded-lg md:rounded-xl artwork-container"
          onClick={() => openSongPage()}
        >
          <img 
            id="player-artwork-image"
            src={currentSong.artwork} 
            alt={currentSong.title}
            referrerPolicy="no-referrer"
            className="w-10 h-10 md:w-12 md:h-12 object-cover border border-white/10 artwork-lift"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <ChevronUp className="w-4 h-4 text-white animate-pulse" />
          </div>
        </div>

        <div className="info truncate flex-1">
          <h4 
            id="player-song-title"
            className="text-white text-xs font-semibold hover:text-pink-400 cursor-pointer truncate tracking-tight font-display"
            onClick={() => openSongPage()}
          >
            {currentSong.title}
          </h4>
          <p id="player-song-artist" className="text-white/40 text-[9px] md:text-[10px] font-mono mt-0.5 truncate uppercase tracking-wider">{currentSong.artist}</p>
        </div>

        {/* Favorite */}
        <div className="shrink-0 hidden md:block">
          <button 
            id="player-favorite-btn"
            onClick={() => toggleFavorite(currentSong.id)}
            className={`p-1.5 rounded-full transition-colors ${isFavorited ? "text-white" : "text-white/40 hover:text-white"}`}
          >
            <Heart className="w-4 h-4" fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* CENTER: MEDIA CONTROLS & TIMELINE (Desktop Only) */}
      <div className="hidden md:flex flex-col items-center gap-2 flex-1 max-w-xl px-4 md:px-8">
        {/* 2. PLAYER CONTROLS */}
        <div className="player-controls flex items-center gap-5">
          <button 
            id="player-shuffle-btn"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-1 transition-colors ${isShuffle ? "text-white" : "text-white/30 hover:text-white"}`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button 
            id="player-prev-btn"
            onClick={onPrev}
            className="text-white/40 hover:text-white p-1 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* PLAY BUTTON (Always Visible) */}
          <button 
            id="player-play-pause-btn"
            onClick={handlePlayPause}
            className="play w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-black fill-black" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 text-black fill-black" />
            )}
          </button>

          <button 
            id="player-next-btn"
            onClick={onNext}
            className="text-white/40 hover:text-white p-1 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button 
            id="player-repeat-btn"
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-1 transition-colors ${isRepeat ? "text-white" : "text-white/30 hover:text-white"}`}
            title="Repeat"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. PROGRESS BAR */}
        <div className="progress-bar w-full flex items-center gap-2.5 text-[9px] text-white/30 font-mono">
          <span>{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center group/timeline">
            <input 
              id="player-timeline-slider"
              type="range"
              min={0}
              max={trackDuration || 100}
              value={currentTime}
              onChange={handleScrub}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none accent-white group-hover/timeline:bg-white/20"
              style={{
                background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                  trackDuration ? (currentTime / trackDuration) * 100 : 0
                }%, rgba(255, 255, 255, 0.1) ${
                  trackDuration ? (currentTime / trackDuration) * 100 : 0
                }%, rgba(255, 255, 255, 0.1) 100%)`
              }}
            />
          </div>
          <span>{currentSong.duration || formatTime(trackDuration)}</span>
        </div>
      </div>

      {/* 4. PLAYER OPTIONS */}
      <div className="player-options flex items-center gap-2 md:gap-3.5 justify-end shrink-0 relative">
        
        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden mr-1">
          {/* Shuffle Button */}
          <button 
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-1.5 transition-all active:scale-95 shrink-0 ${isShuffle ? "text-pink-400" : "text-white/40 hover:text-white"}`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Song Forward Left (Prev) */}
          <button 
            onClick={onPrev}
            className="p-1.5 text-white/60 hover:text-white active:scale-95 transition-all shrink-0"
            title="Previous"
          >
            <SkipBack className="w-4.5 h-4.5" />
          </button>

          {/* Play/Pause in Middle */}
          <button
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md active:scale-95 hover:scale-105 transition-all shrink-0"
            title="Play / Pause"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-black fill-black" /> : <Play className="w-3.5 h-3.5 ml-0.5 text-black fill-black" />}
          </button>

          {/* Song Forward Right (Next) */}
          <button
            onClick={onNext}
            className="p-1.5 text-white/60 hover:text-white active:scale-95 transition-all shrink-0"
            title="Next"
          >
            <SkipForward className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3.5">
          {currentSong?.source === "YouTube" && (
            <button 
              id="player-toggle-yt-screen-btn"
              onClick={() => setShowYtScreen(!showYtScreen)}
              className={`p-1.5 rounded-lg transition-all ${showYtScreen ? "text-red-500 bg-red-500/10 hover:text-red-400" : "text-white/40 hover:text-white"}`}
              title="Toggle Video Screen"
            >
              <Video className="w-4.5 h-4.5" />
            </button>
          )}

          <button 
            id="player-lyrics-btn"
            onClick={() => openSongPage("lyrics")}
            className="p-1.5 text-white/40 hover:text-white transition-all hidden sm:block"
            title="Lyrics"
          >
            <FileText className="w-4.5 h-4.5" />
          </button>

          <button 
            id="player-queue-btn"
            onClick={() => setShowQueue(!showQueue)}
            className={`p-1.5 rounded-lg transition-all ${showQueue ? "text-white bg-white/10" : "text-white/40 hover:text-white"}`}
            title="Queue"
          >
            <ListMusic className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* VOLUME CONTROL (Desktop Only) */}
        <div className="volume-slider hidden md:flex items-center gap-1.5 pl-2 border-l border-white/5">
          <button 
            id="player-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input 
            id="player-volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-12 md:w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume * 100}%, rgba(255, 255, 255, 0.1) ${volume * 100}%, rgba(255, 255, 255, 0.1) 100%)`
            }}
          />
        </div>

        {/* FLOATING QUEUE POPOVER */}
        {showQueue && (
          <div 
            id="player-queue-popover"
            className="absolute bottom-24 right-0 w-72 max-h-80 bg-neutral-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl z-[60] flex flex-col gap-2.5 animate-[fadeIn_0.2s_ease-out]"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white font-semibold text-xs font-display">Play Queue ({queue.length})</span>
              {queue.length > 0 && (
                <button 
                  id="queue-clear-btn"
                  onClick={() => setQueue([])} 
                  className="text-[10px] text-white/40 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 flex flex-col gap-1.5 max-h-56 pr-1">
              {queue.length === 0 ? (
                <p id="queue-empty-text" className="text-white/30 text-[10px] text-center py-6">Queue is empty. Click any song to add.</p>
              ) : (
                queue.map((song, i) => (
                  <div 
                     key={`${song.id}-${i}`}
                     id={`queue-item-${song.id}-${i}`}
                     className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-white/5 group/qitem transition-colors cursor-pointer"
                     onClick={() => onSongClick(song)}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      <img src={song.artwork} className="w-7 h-7 rounded object-cover" alt="" referrerPolicy="no-referrer" />
                      <div className="truncate">
                        <p className="text-white text-[11px] font-medium truncate">{song.title}</p>
                        <p className="text-white/40 text-[9px] truncate font-mono">{song.artist}</p>
                      </div>
                    </div>
                    
                    <button 
                      id={`queue-remove-btn-${i}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(i);
                      }}
                      className="opacity-0 group-hover/qitem:opacity-100 text-[9px] text-white/40 hover:text-white px-1.5 py-0.5"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING YOUTUBE VISION FEED SCREEN */}
      {currentSong?.source === "YouTube" && showYtScreen && (
        <div 
          id="velvet-youtube-screen-card"
          className={`fixed bottom-28 right-6 bg-neutral-950/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[9999] transition-all duration-300 flex flex-col ${
            isYtExpanded ? "w-[480px] h-[310px]" : "w-[320px] h-[220px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] font-mono tracking-wider text-white/60 uppercase">YouTube Live Feed</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsYtExpanded(!isYtExpanded)}
                className="text-[9px] font-mono uppercase tracking-widest text-white/40 hover:text-white px-1.5 py-0.5 hover:bg-white/5 rounded transition-all"
              >
                {isYtExpanded ? "Compact" : "Expand"}
              </button>
              <button 
                onClick={() => {
                  setShowYtScreen(false);
                  if (ytPlayerRef.current) {
                    try {
                      ytPlayerRef.current.destroy();
                    } catch (e) {
                      console.error("Error destroying YT player:", e);
                    }
                    ytPlayerRef.current = null;
                  }
                }}
                className="text-[9px] font-mono uppercase tracking-widest text-white/40 hover:text-white px-1.5 py-0.5 hover:bg-white/5 rounded transition-all"
              >
                Hide
              </button>
            </div>
          </div>
          
          {/* Video element */}
          <div className="flex-1 w-full bg-black relative">
            <div id="youtube-player-div" className="absolute inset-0 w-full h-full"></div>
          </div>
        </div>
      )}
    </footer>
  );
}
