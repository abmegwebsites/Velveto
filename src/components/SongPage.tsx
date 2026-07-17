import React, { useState, useEffect, useRef } from "react";
import { 
  X, MessageSquare, Star, Send, Heart, Play, Sparkles, Video, 
  BookOpen, HelpCircle, AlertTriangle, RefreshCw, FileText 
} from "lucide-react";
import { Song, Comment } from "../types";

interface SongPageProps {
  song: Song;
  onClose: () => void;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  relatedSongs: Song[];
  favorites: string[];
  toggleFavorite: (songId: string) => void;
  onAddSongToQueue: (song: Song) => void;
}

export default function SongPage({
  song,
  onClose,
  isPlaying,
  onPlaySong,
  relatedSongs,
  favorites,
  toggleFavorite,
  onAddSongToQueue
}: SongPageProps) {
  const [activeTab, setActiveTab] = useState<"lyrics" | "details" | "comments" | "video">("lyrics");
  const [userRating, setUserRating] = useState<number>(song.rating ? Math.round(song.rating) : 5);
  const [comments, setComments] = useState<Comment[]>(song.comments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(song.lyrics || null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [replacingSong, setReplacingSong] = useState(false);
  const [replacementNote, setReplacementNote] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sync state when song changes
  useEffect(() => {
    setComments(song.comments || []);
    setGeneratedLyrics(song.lyrics || null);
    setReplacementNote(null);
  }, [song]);

  // Audio Visualizer effect (Canvas-based monochrome waves)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = 140);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = 140;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let phase = 0;
    const renderVisuals = () => {
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount - 2.5;

      // Draw responsive visualizer bars (Luxurious monochrome style)
      for (let i = 0; i < barCount; i++) {
        const factor = isPlaying ? Math.sin(phase + i * 0.12) * 0.45 + 0.55 : 0.05;
        const barHeight = factor * (height - 24) + 4;

        // Clean monochrome alpha gradient
        const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.04)");
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0.75)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(i * (width / barCount), height - barHeight, barWidth, barHeight, 2);
        ctx.fill();
      }

      phase += isPlaying ? 0.06 : 0.003;
      animationRef.current = requestAnimationFrame(renderVisuals);
    };

    renderVisuals();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Generate creative AI lyrics
  const handleGenerateAILyrics = async () => {
    setIsGeneratingLyrics(true);
    try {
      const res = await fetch("/api/gemini/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: song.title, artist: song.artist })
      });
      const data = await res.json();
      if (data.lyrics) {
        setGeneratedLyrics(data.lyrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  // Find AI Replacement for Unavailable songs
  const handleFindReplacement = async () => {
    setReplacingSong(true);
    try {
      const res = await fetch("/api/gemini/find-replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: song.title, artist: song.artist, query: song.replacementQuery })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setReplacementNote(data.data.note);
        onPlaySong({
          ...song,
          title: data.data.title,
          artist: data.data.artist,
          album: data.data.album,
          duration: data.data.duration,
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", // Use an active stream
          artwork: data.data.artwork,
          isUnavailable: false
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReplacingSong(false);
    }
  };

  // Submitting comments
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const added: Comment = {
      id: `comment-${Date.now()}`,
      author: "Drishti (You)",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      text: newCommentText,
      timestamp: "Just now",
      likes: 0
    };

    setComments([added, ...comments]);
    setNewCommentText("");
  };

  const likeComment = (id: string) => {
    setComments(comments.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c));
  };

  const isFavorited = favorites.includes(song.id);

  return (
    <div 
      id="immersive-song-page"
      className="fixed inset-0 bg-black/95 z-[100] overflow-y-auto flex flex-col backdrop-blur-3xl animate-[fadeIn_0.35s_ease-out]"
    >
      {/* HEADER SECTION */}
      <div className="relative h-20 px-8 flex items-center justify-between border-b border-white/[0.04] bg-black/40 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white/50" />
          <span className="text-white/60 font-display font-medium text-xs tracking-[0.2em] uppercase">Velvet Immersive</span>
        </div>
        <button 
          id="close-immersive-btn"
          onClick={onClose}
          className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col lg:flex-row gap-12 z-10 relative">
        
        {/* LEFT COLUMN: ARTWORK, VISUALIZER */}
        <div className="w-full lg:w-[38%] flex flex-col gap-8">
          <div className="bg-white/[0.01] border border-white/[0.04] rounded-3xl p-6 flex flex-col items-center shadow-xl">
            <div className="relative aspect-square w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06] transition-all duration-700 hover:scale-[1.01]">
              <img 
                id="immersive-artwork"
                src={song.artwork} 
                alt={song.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* SONG DETAILS */}
            <div className="text-center mt-6 w-full px-4">
              <h2 id="immersive-song-title" className="text-white font-display text-xl font-light tracking-tight leading-tight">{song.title}</h2>
              <p id="immersive-song-artist" className="text-white/40 font-mono text-[10px] uppercase tracking-widest mt-1.5">{song.artist}</p>
              <p id="immersive-song-album" className="text-white/20 text-[9px] font-mono mt-1 uppercase tracking-widest">{song.album}</p>
            </div>

            {/* FAVORITE BUTTON */}
            <button 
              id="immersive-fav-btn"
              onClick={() => toggleFavorite(song.id)}
              className={`mt-4 px-4 py-1.5 rounded-full border border-white/[0.06] text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1.5 ${isFavorited ? "text-white bg-white/5" : "text-white/40 hover:text-white"}`}
            >
              <Heart className="w-3.5 h-3.5" fill={isFavorited ? "currentColor" : "none"} />
              {isFavorited ? "Added to Library" : "Save to Library"}
            </button>

            {/* UNAVAILABLE WARNING CARD */}
            {song.isUnavailable && (
              <div className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 mt-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-white font-medium text-xs font-display">Track Unavailable</h5>
                    <p className="text-white/30 text-[10px] leading-relaxed mt-1 font-light">Cross-platform synchronization boundaries or licensing blocks have caused this track to go cold.</p>
                  </div>
                </div>
                <button
                  id="immersive-find-replacement-btn"
                  onClick={handleFindReplacement}
                  disabled={replacingSong}
                  className="w-full h-9 bg-white hover:bg-white/90 disabled:bg-white/20 text-black font-semibold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {replacingSong ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {replacingSong ? "Searching..." : "AI Find Active Replacement"}
                </button>
              </div>
            )}

            {/* REPLACEMENT SUCCESS ALERT */}
            {replacementNote && (
              <div className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 mt-4 text-[10px] text-white/60 leading-relaxed font-light">
                <span className="text-white font-mono uppercase tracking-widest block mb-1">🎉 Companion Located</span>
                {replacementNote}
              </div>
            )}

            {/* VISUALIZER DOCK */}
            <div className="w-full mt-6 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[8px] uppercase font-mono text-white/30 tracking-widest">Acoustic Spectrum</span>
                <span className={`w-1 h-1 rounded-full ${isPlaying ? "bg-white animate-ping" : "bg-white/10"}`}></span>
              </div>
              <canvas ref={canvasRef} className="w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL TABS, LYRICS PANEL, COMMENTS */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* TAB BAR NAVIGATION */}
          <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-1 flex gap-1.5 shrink-0">
            <button 
              id="immersive-tab-lyrics"
              onClick={() => setActiveTab("lyrics")}
              className={`flex-1 py-2.5 text-center rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeTab === "lyrics" ? "bg-white/[0.05] text-white" : "text-white/40 hover:text-white"}`}
            >
              Lyrics
            </button>
            <button 
              id="immersive-tab-details"
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-2.5 text-center rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeTab === "details" ? "bg-white/[0.05] text-white" : "text-white/40 hover:text-white"}`}
            >
              Artist Info
            </button>
            <button 
              id="immersive-tab-comments"
              onClick={() => setActiveTab("comments")}
              className={`flex-1 py-2.5 text-center rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeTab === "comments" ? "bg-white/[0.05] text-white" : "text-white/40 hover:text-white"}`}
            >
              Reviews ({comments.length})
            </button>
            {song.videoUrl && (
              <button 
                id="immersive-tab-video"
                onClick={() => setActiveTab("video")}
                className={`flex-1 py-2.5 text-center rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeTab === "video" ? "bg-white/[0.05] text-white" : "text-white/40 hover:text-white"}`}
              >
                Video Feed
              </button>
            )}
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 bg-white/[0.01] border border-white/[0.04] rounded-3xl p-8 min-h-[350px] relative overflow-y-auto">
            
            {/* LYRICS PANEL */}
            {activeTab === "lyrics" && (
              <div id="lyrics-tab-content" className="flex flex-col h-full justify-between">
                <div className="whitespace-pre-line font-display text-white/80 text-sm md:text-base leading-relaxed max-h-[300px] overflow-y-auto pr-2">
                  {generatedLyrics ? (
                    generatedLyrics
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-white/30">
                      <FileText className="w-8 h-8 mb-3 opacity-30 text-white" />
                      <p className="text-xs font-mono uppercase tracking-widest">No Lyrics Synced</p>
                      <p className="text-[10px] text-white/20 max-w-xs mt-1 font-light leading-relaxed">No synchronized verses exist for this track. Summon a creative remix sequence using Google Gemini.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[8px] text-white/30 font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-white/40" /> Powered by Gemini-3.5-Flash
                  </span>
                  <button 
                    id="generate-lyrics-ai-btn"
                    onClick={handleGenerateAILyrics}
                    disabled={isGeneratingLyrics}
                    className="h-8 px-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-white/60 hover:text-white font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingLyrics ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isGeneratingLyrics ? "Synthesizing..." : "AI Generate Verses"}
                  </button>
                </div>
              </div>
            )}

            {/* ARTIST PROFILE */}
            {activeTab === "details" && (
              <div id="details-tab-content" className="flex flex-col gap-6">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase block mb-1">Curation Bio</span>
                  <h4 className="text-white font-display text-sm font-medium mb-3">Artist Profile</h4>
                  <p className="text-white/50 text-xs leading-relaxed font-light">{song.artistBio || "This artist's profile is currently queued for official synchronization with Velvet curators."}</p>
                </div>

                <div className="mt-4">
                  <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase block mb-1">Catalog Registry</span>
                  <h4 className="text-white font-display text-sm font-medium mb-3">Discography Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5">
                      <span className="text-white/30 block uppercase tracking-wider">Album Title</span>
                      <span className="text-white font-medium mt-1.5 block">{song.album}</span>
                    </div>
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5">
                      <span className="text-white/30 block uppercase tracking-wider">Curation Origin</span>
                      <span className="text-white font-medium mt-1.5 block">{song.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COMMENTS & REVIEWS */}
            {activeTab === "comments" && (
              <div id="comments-tab-content" className="flex flex-col h-full justify-between">
                
                {/* TRACK RATINGS */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                  <div className="text-center sm:text-left text-xs">
                    <span className="text-white font-medium block">How is the acoustic vibe?</span>
                    <span className="text-white/30 text-[10px] mt-0.5 block font-light">Rate this track to shape AI discovery feeds.</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/[0.02] p-1.5 rounded-xl border border-white/[0.06]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        id={`star-rating-btn-${star}`}
                        onClick={() => setUserRating(star)}
                        className="p-1 text-white hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star 
                          className="w-4 h-4" 
                          fill={star <= userRating ? "currentColor" : "none"} 
                          stroke={star <= userRating ? "currentColor" : "rgba(255, 255, 255, 0.25)"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* REVIEWS LIST */}
                <div className="flex-1 overflow-y-auto max-h-[180px] flex flex-col gap-3 pr-2 mb-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-white/20 text-xs font-light">Be the first to leave an acoustic footprint on this track.</div>
                  ) : (
                    comments.map((comment) => (
                      <div 
                        key={comment.id} 
                        id={`comment-item-${comment.id}`}
                        className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 flex gap-3 items-start"
                      >
                        <img 
                          src={comment.avatar} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-xs">{comment.author}</span>
                            <span className="text-white/30 text-[9px] font-mono">{comment.timestamp}</span>
                          </div>
                          <p className="text-white/60 text-xs mt-1.5 leading-relaxed font-light">{comment.text}</p>
                        </div>
                        <button 
                          id={`like-comment-btn-${comment.id}`}
                          onClick={() => likeComment(comment.id)}
                          className="flex items-center gap-1 text-[9px] font-mono text-white/30 hover:text-white p-1 rounded transition-all shrink-0"
                        >
                          <Heart className="w-3 h-3" fill={comment.likes > 0 ? "currentColor" : "none"} />
                          <span>{comment.likes}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* REVIEW COMPOSER */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-3 border-t border-white/[0.04]">
                  <input
                    id="new-comment-input"
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a custom track review..."
                    className="flex-1 h-9 px-4 rounded-xl text-xs text-white glass-input outline-none focus:border-white/20"
                  />
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

              </div>
            )}

            {/* VIDEO FEED */}
            {activeTab === "video" && song.videoUrl && (
              <div id="video-tab-content" className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-neutral-950 shadow-2xl">
                <iframe 
                  id="immersive-video-iframe"
                  src={song.videoUrl} 
                  title={`${song.title} video feed`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              </div>
            )}

          </div>

          {/* COMPANION DISCOVERIES */}
          <div>
            <h4 className="text-white font-display text-xs uppercase tracking-[0.2em] font-medium text-white/50 mb-3.5 px-1">Companion Discoveries</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedSongs.slice(0, 4).map((related) => (
                <div 
                  key={related.id} 
                  id={`related-song-card-${related.id}`}
                  className="bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] rounded-xl p-2.5 flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img 
                      src={related.artwork} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                    <div className="truncate text-[11px]">
                      <p className="text-white font-medium truncate font-display tracking-tight">{related.title}</p>
                      <p className="text-white/40 truncate mt-0.5 font-mono text-[9px]">{related.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      id={`play-related-btn-${related.id}`}
                      onClick={() => onPlaySong(related)}
                      className="p-1 rounded-full bg-white text-black transition-all cursor-pointer"
                      title="Play now"
                    >
                      <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
