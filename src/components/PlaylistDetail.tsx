import React, { useState } from "react";
import { 
  Play, Pause, Shuffle, Heart, Calendar, Clock, ArrowLeft, 
  Upload, Image as ImageIcon, Sparkles, Check, ChevronRight, Music
} from "lucide-react";
import { Song, Playlist } from "../types";

interface PlaylistDetailProps {
  playlist: Playlist;
  currentSong: Song | null;
  isPlaying: boolean;
  favorites: string[];
  onPlaySong: (song: Song) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onShufflePlaylist: (playlist: Playlist) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
  toggleFavorite: (songId: string) => void;
  onBack: () => void;
  onUpdateArtwork: (playlistId: string, artworkUrl: string) => void;
  onUpdateNameAndDesc: (playlistId: string, name: string, desc: string) => void;
  getSongTouchHandlers?: (song: Song) => any;
  lastLongPressTimeRef?: React.MutableRefObject<number>;
}

export default function PlaylistDetail({
  playlist,
  currentSong,
  isPlaying,
  favorites,
  onPlaySong,
  onPlayPlaylist,
  onShufflePlaylist,
  onSongContextMenu,
  toggleFavorite,
  onBack,
  onUpdateArtwork,
  onUpdateNameAndDesc,
  getSongTouchHandlers,
  lastLongPressTimeRef
}: PlaylistDetailProps) {
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Local state for renaming
  const [editName, setEditName] = useState(playlist.name);
  const [editDesc, setEditDesc] = useState(playlist.description);

  // File upload reader
  const handleCustomImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      if (base64Data) {
        onUpdateArtwork(playlist.id, base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCustomImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleCustomImageUpload(e.target.files[0]);
    }
  };

  // Helper to calculate total duration beautifully
  const calculateTotalDuration = (songsList: Song[]) => {
    let totalSeconds = 0;
    songsList.forEach(song => {
      const parts = song.duration.split(":");
      if (parts.length === 2) {
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        totalSeconds += (mins * 60) + secs;
      }
    });
    if (totalSeconds === 0) return "0 min";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs} hr ${mins} min`;
    }
    return `${mins} min ${secs} sec`;
  };

  const totalDuration = calculateTotalDuration(playlist.songs);
  const creationDate = playlist.createdAt || "Jul 15, 2026";

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateNameAndDesc(playlist.id, editName.trim(), editDesc.trim());
    setShowRenameModal(false);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in relative z-10 max-w-5xl mx-auto w-full">
      {/* BACK NAVIGATION HEADER */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-all text-xs font-mono uppercase tracking-widest bg-white/[0.03] border border-white/5 hover:border-white/10 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowRenameModal(true)}
            className="text-[10px] text-white/50 hover:text-white font-mono tracking-widest uppercase bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all"
          >
            Rename Playlist
          </button>
          <button
            onClick={() => setShowCoverModal(true)}
            className="text-[10px] text-pink-500 hover:text-pink-400 font-mono tracking-widest uppercase bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all"
          >
            Change Cover
          </button>
        </div>
      </div>

      {/* HERO HERO HEADER SECTION */}
      <section className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-10 pb-8 border-b border-white/[0.04]">
        {/* PLAYLIST COVER CONTAINER WITH HOVER */}
        <div 
          onClick={() => setShowCoverModal(true)}
          className="w-56 h-56 md:w-64 md:h-64 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group cursor-pointer shrink-0 artwork-container"
        >
          <img 
            src={playlist.artwork} 
            alt={playlist.name} 
            className="w-full h-full object-cover artwork-lift transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ImageIcon className="w-8 h-8 text-white/80 mb-2 animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/90">Change Cover</span>
          </div>
        </div>

        {/* PLAYLIST METADATA */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/50 text-[8px] font-mono tracking-widest uppercase mb-4 self-center md:self-start">
            <Sparkles className="w-2.5 h-2.5 text-pink-500" /> Playlist Portfolio
          </span>
          
          <h1 className="text-white font-display text-3xl md:text-5xl lg:text-6xl font-light tracking-tight select-none leading-none mb-4 truncate max-w-xl">
            {playlist.name}
          </h1>
          
          <p className="text-white/40 text-xs md:text-sm font-light leading-relaxed mb-6 max-w-2xl font-mono tracking-wide">
            {playlist.description || "A custom curated list of sound tracks."}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/50 text-[10px] font-mono tracking-wider uppercase">
            <span className="text-white font-semibold">{playlist.owner}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
            <span className="text-white">{playlist.songs.length} Tracks</span>
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-white/30" /> {totalDuration}</span>
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-white/30" /> Created {creationDate}</span>
          </div>
        </div>
      </section>

      {/* PLAY & SHUFFLE CONTROLS */}
      <div className="flex items-center gap-4">
        {playlist.songs.length > 0 ? (
          <>
            <button
              onClick={() => onPlayPlaylist(playlist)}
              className="h-12 px-8 bg-white hover:bg-neutral-200 text-black font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 shadow-lg font-mono"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Play Session</span>
            </button>
            <button
              onClick={() => onShufflePlaylist(playlist)}
              className="h-12 px-6 border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md font-mono"
            >
              <Shuffle className="w-4 h-4 text-white" />
              <span>Shuffle</span>
            </button>
          </>
        ) : (
          <div className="text-white/30 text-xs font-mono uppercase tracking-widest">
            Add tracks using the right-click menu to activate player.
          </div>
        )}
      </div>

      {/* TRACKS LIST TABLE */}
      <div className="mt-4">
        <div className="glass-panel rounded-3xl p-4 flex flex-col gap-2">
          {playlist.songs.length === 0 ? (
            <div className="py-20 text-center text-white/30 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-xs font-mono uppercase tracking-widest">This Playlist is Empty</p>
              <p className="text-[10px] text-white/20 max-w-sm leading-relaxed font-light">
                Right-click any track in your library or search results and choose <strong className="text-white/40 font-normal">"Add to Playlist"</strong> to populate this curated portfolio.
              </p>
            </div>
          ) : (
            playlist.songs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={song.id}
                  id={`playlist-track-item-${song.id}`}
                  onClick={() => {
                    if (lastLongPressTimeRef && Date.now() - lastLongPressTimeRef.current < 400) return;
                    onPlaySong(song);
                  }}
                  onContextMenu={(e) => onSongContextMenu(e, song)}
                  {...(getSongTouchHandlers ? getSongTouchHandlers(song) : {})}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4 truncate flex-1">
                    <span className="text-white/20 text-[10px] font-mono w-4 shrink-0 text-center group-hover:text-pink-400 transition-colors">
                      {index + 1}
                    </span>
                    
                    <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 border border-white/5 artwork-container">
                      <img 
                        src={song.artwork} 
                        className="w-full h-full object-cover artwork-lift" 
                        alt="" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    
                    <div className="truncate text-xs flex-1 max-w-xs">
                      <p className={`font-medium truncate font-display tracking-tight text-xs ${isCurrent ? "text-pink-400 font-semibold" : "text-white"}`}>
                        {song.title}
                      </p>
                      <p className="text-white/40 truncate font-mono text-[9px] uppercase tracking-widest mt-1">
                        {song.artist}
                      </p>
                    </div>

                    <div className="text-white/30 font-mono text-[9px] uppercase tracking-widest truncate hidden md:block max-w-[150px] ml-4">
                      {song.album}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/5 text-white/50 text-[8px] font-mono uppercase tracking-widest">
                      {song.source}
                    </span>
                    <span className="text-white/30 text-[10px] font-mono font-light">
                      {song.duration}
                    </span>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(song.id);
                      }}
                      className={`p-1.5 rounded-full transition-colors ${favorites.includes(song.id) ? "text-pink-500 hover:text-white" : "text-white/35 hover:text-white"}`}
                      title={favorites.includes(song.id) ? "Remove from Favorites" : "Save to Favorites"}
                    >
                      <Heart className="w-4 h-4" fill={favorites.includes(song.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHANGE COVER OPTIONS MODAL */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <h3 className="text-white font-display text-base font-semibold mb-1">Playlist Cover Configuration</h3>
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-6">Choose cover image mapping</p>
            
            <div className="flex flex-col gap-3">
              {/* Option 1: Automatically use first song thumbnail */}
              <button
                onClick={() => {
                  if (playlist.songs.length > 0) {
                    onUpdateArtwork(playlist.id, playlist.songs[0].artwork);
                  } else {
                    alert("Please add some songs to use this option!");
                  }
                  setShowCoverModal(false);
                }}
                className="w-full flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl transition-all text-left text-xs"
              >
                <div>
                  <p className="text-white font-medium mb-0.5">Automatic Thumbnail</p>
                  <p className="text-white/40 text-[9px]">Maps cover to the first song in this playlist</p>
                </div>
                <Sparkles className="w-4 h-4 text-pink-500 shrink-0 ml-4" />
              </button>

              {/* Option 2: Choose existing song thumbnail */}
              {playlist.songs.length > 0 && (
                <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3.5 flex flex-col gap-2">
                  <p className="text-white text-xs font-medium mb-1">Choose from Songs</p>
                  <div className="grid grid-cols-5 gap-2 max-h-[110px] overflow-y-auto pr-1">
                    {playlist.songs.map((song) => (
                      <div 
                        key={song.id}
                        onClick={() => {
                          onUpdateArtwork(playlist.id, song.artwork);
                          setShowCoverModal(false);
                        }}
                        className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-pink-500 cursor-pointer relative group transition-all"
                        title={song.title}
                      >
                        <img src={song.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 3: Drag & Drop Custom Cover Uploader */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("custom-cover-file-input")?.click()}
                className={`border border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? "border-pink-500 bg-pink-500/5" 
                    : "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]"
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  id="custom-cover-file-input" 
                />
                <Upload className={`w-6 h-6 ${isDragging ? "text-pink-400" : "text-white/40"}`} />
                <p className="text-white text-xs font-medium">Drag & Drop Image</p>
                <p className="text-white/30 text-[9px] font-mono uppercase tracking-wider">or click to browse local files</p>
              </div>
            </div>

            <div className="flex items-center justify-end mt-6">
              <button
                onClick={() => setShowCoverModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-mono uppercase tracking-widest transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME PLAYLIST MODAL */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleRenameSubmit} className="bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <h3 className="text-white font-display text-base font-semibold mb-1">Rename Playlist Portfolio</h3>
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-6">Modify metadata fields</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono uppercase tracking-wider text-white/40">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25 w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono uppercase tracking-wider text-white/40">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25 w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 font-mono text-[10px] uppercase tracking-widest font-semibold">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer shadow-md"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
