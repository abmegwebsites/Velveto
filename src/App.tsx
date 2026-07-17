import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Search, Heart, Compass, Library, User, 
  Sparkles, Plus, FolderPlus, Upload, HelpCircle, CheckCircle2, 
  History, MessageSquare, Globe, AlertCircle, Sparkle, Lock, 
  Eye, Trash2, RefreshCw, Award, Volume2, ChevronUp, PlusCircle,
  Edit2, Check, Calendar, Clock, Shuffle, Camera, Headphones, Music, X
} from "lucide-react";
import { Song, Playlist, Folder, Achievement, Creator } from "./types";
import { SEED_SONGS, MOOD_PLAYLISTS, CREATORS, ACHIEVEMENTS } from "./data";
import MusicPlayer from "./components/MusicPlayer";
import SongPage from "./components/SongPage";
import LoginScreen from "./components/LoginScreen";
import PlaylistDetail from "./components/PlaylistDetail";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const THEME_PRESETS = [
  { id: "velvet", name: "Velvet Pink", accent: "#FF006E", blob1: "236, 72, 153", blob2: "249, 115, 22" },
  { id: "cyan", name: "Electric Cyan", accent: "#06B6D4", blob1: "6, 182, 212", blob2: "99, 102, 241" },
  { id: "emerald", name: "Emerald Bass", accent: "#10B981", blob1: "16, 185, 129", blob2: "6, 182, 212" },
  { id: "amber", name: "Neon Amber", accent: "#F59E0B", blob1: "245, 158, 11", blob2: "239, 68, 68" },
  { id: "indigo", name: "Aura Indigo", accent: "#6366F1", blob1: "99, 102, 241", blob2: "236, 72, 153" },
  { id: "crimson", name: "Crimson Heat", accent: "#EF4444", blob1: "239, 68, 68", blob2: "249, 115, 22" }
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"home" | "library" | "discover" | "profile" | "favorites" | "imported" | "playlist">("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Login/Logout State (authenticated user session)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem("velvet_is_logged_in");
    return saved === "true";
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem("velvet_user_email") || "";
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("velvet_user_name") || "";
  });

  const [userDesc, setUserDesc] = useState<string>(() => {
    return localStorage.getItem("velvet_user_desc") || "Audiophile & curated sound collector on Velvet.";
  });

  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem("velvet_user_avatar") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [listeningHours, setListeningHours] = useState<number>(() => {
    const saved = localStorage.getItem("velvet_listening_hours");
    return saved ? parseFloat(saved) : 142.7;
  });

  const [playCounts, setPlayCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("velvet_play_counts");
    if (saved) return JSON.parse(saved);
    // Seed initial play counts to look beautiful immediately
    const initial: Record<string, number> = {};
    SEED_SONGS.forEach((song, idx) => {
      initial[song.id] = Math.floor(48 - idx * 6 + Math.random() * 4);
    });
    return initial;
  });

  const [weeklyListening, setWeeklyListening] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("velvet_weekly_listening");
    if (saved) return JSON.parse(saved);
    return {
      Mon: 2.4,
      Tue: 1.8,
      Wed: 3.5,
      Thu: 4.2,
      Fri: 2.9,
      Sat: 5.6,
      Sun: 4.8
    };
  });

  // Controls if we show the login/sign up screen overlay
  const [showLoginOverlay, setShowLoginOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem("velvet_is_logged_in");
    return saved !== "true";
  });

  // Subscribe to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || "");
        setUserName(user.displayName || (user.email ? user.email.split("@")[0] : "Velvet User"));
        setIsLoggedIn(true);
        setShowLoginOverlay(false);
      } else {
        // If logged out on firebase, keep local values unless explicitly logged out
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("velvet_is_logged_in", String(isLoggedIn));
    localStorage.setItem("velvet_user_email", userEmail);
    localStorage.setItem("velvet_user_name", userName);
    localStorage.setItem("velvet_user_desc", userDesc);
    localStorage.setItem("velvet_user_avatar", userAvatar);
    localStorage.setItem("velvet_listening_hours", String(listeningHours));
    localStorage.setItem("velvet_play_counts", JSON.stringify(playCounts));
    localStorage.setItem("velvet_weekly_listening", JSON.stringify(weeklyListening));
  }, [isLoggedIn, userEmail, userName, userDesc, userAvatar, listeningHours, playCounts, weeklyListening]);

  // Click outside to close the avatar upload glassmorphism popover
  useEffect(() => {
    if (!showUploadModal) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const modalBox = document.querySelector("#avatar-upload-modal > div");
      if (modalBox && !modalBox.contains(e.target as Node)) {
        // Prevent closing if we are clicking the profile image/change pic area
        const changePicBtn = document.querySelector(".group");
        if (changePicBtn && changePicBtn.contains(e.target as Node)) {
          return;
        }
        setShowUploadModal(false);
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [showUploadModal]);

  // Click outside to close the search bar suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const searchContainer = document.querySelector(".search-bar");
      if (searchContainer && !searchContainer.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const handleLoginSuccess = (email: string, name: string) => {
    setUserEmail(email);
    setUserName(name);
    setIsLoggedIn(true);
    setShowLoginOverlay(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase sign out error:", err);
    }
    setIsLoggedIn(false);
    setUserEmail("");
    setUserName("Guest Listener");
    setUserDesc("Audiophile & curated sound collector on Velvet.");
    setUserAvatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80");
    setListeningHours(142.7);
    setActiveTab("home");
    setShowLoginOverlay(true);
  };

  // Library State
  const [songsList, setSongsList] = useState<Song[]>(() => {
    const saved = localStorage.getItem("velvet_songs");
    return saved ? JSON.parse(saved) : SEED_SONGS;
  });
  
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem("velvet_playlists");
    return saved ? JSON.parse(saved) : MOOD_PLAYLISTS;
  });
  
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem("velvet_folders");
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("velvet_favorites");
    return saved ? JSON.parse(saved) : ["v1", "v3"];
  });

  const [history, setHistory] = useState<Song[]>(() => {
    const saved = localStorage.getItem("velvet_history");
    return saved ? JSON.parse(saved) : [SEED_SONGS[2], SEED_SONGS[0], SEED_SONGS[1]];
  });

  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    const saved = localStorage.getItem("velvet_achievements");
    return saved ? JSON.parse(saved) : ["a1"]; // Velvet Explorer is unlocked initially
  });

  // Theme Personalization States
  const [themeAccent, setThemeAccent] = useState<string>(() => {
    return localStorage.getItem("velvet_theme_accent") || "#FF006E";
  });
  const [themeBlob1, setThemeBlob1] = useState<string>(() => {
    return localStorage.getItem("velvet_theme_blob1") || "236, 72, 153";
  });
  const [themeBlob2, setThemeBlob2] = useState<string>(() => {
    return localStorage.getItem("velvet_theme_blob2") || "249, 115, 22";
  });
  const [themeName, setThemeName] = useState<string>(() => {
    return localStorage.getItem("velvet_theme_name") || "Velvet Pink";
  });
  const [sidebarTab, setSidebarTab] = useState<"playlists" | "theme">("theme");

  useEffect(() => {
    localStorage.setItem("velvet_theme_accent", themeAccent);
    localStorage.setItem("velvet_theme_blob1", themeBlob1);
    localStorage.setItem("velvet_theme_blob2", themeBlob2);
    localStorage.setItem("velvet_theme_name", themeName);
  }, [themeAccent, themeBlob1, themeBlob2, themeName]);

  const hexToRgbStr = (hex: string): string => {
    const cleanHex = hex.replace("#", "");
    const bigint = parseInt(cleanHex, 16);
    if (isNaN(bigint)) return "236, 72, 153";
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  const darkenColorHex = (hex: string, percent: number): string => {
    const cleanHex = hex.replace("#", "");
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return "#E0005F";
    let r = (num >> 16) - Math.round(2.55 * percent);
    let g = ((num >> 8) & 0x00FF) - Math.round(2.55 * percent);
    let b = (num & 0x0000FF) - Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Current Playing Track State
  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    return SEED_SONGS[0];
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [activeSongView, setActiveSongView] = useState<Song | null>(null);

  // Search & Import inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [homeConverterTab, setHomeConverterTab] = useState<"youtube" | "playlist">("youtube");
  const [homeImportUrl, setHomeImportUrl] = useState("");
  const [homeImportLoading, setHomeImportLoading] = useState(false);
  const [homeImportStatus, setHomeImportStatus] = useState<string | null>(null);
  const [latestConvertedPlaylist, setLatestConvertedPlaylist] = useState<Playlist | null>(null);

  // YouTube individual track import state
  const [ytImportUrl, setYtImportUrl] = useState("");
  const [ytImportLoading, setYtImportLoading] = useState(false);
  const [ytImportError, setYtImportError] = useState<string | null>(null);
  const [ytImportSuccess, setYtImportSuccess] = useState<string | null>(null);
  const [renamingSongId, setRenamingSongId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [ytPlaybackTrigger, setYtPlaybackTrigger] = useState(0);

  // Context Menu and Deletion States
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    song: Song | null;
    playlist: Playlist | null;
    type: "song" | "playlist" | null;
    fromPlaylistId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    song: null,
    playlist: null,
    type: null,
    fromPlaylistId: null
  });

  const [deleteConfirmSong, setDeleteConfirmSong] = useState<Song | null>(null);

  // Quick playlist creation modal state (from context menu)
  const [quickCreatePlaylistSong, setQuickCreatePlaylistSong] = useState<Song | null>(null);
  const [quickPlaylistName, setQuickPlaylistName] = useState("");
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Drag & Drop / File Upload Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropperSrc(event.target.result as string);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setShowCropper(true);
        setShowUploadModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Cropper Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const cropImage = () => {
    const img = new Image();
    img.src = cropperSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Output high-quality compressed JPEG (256x256)
      canvas.width = 256;
      canvas.height = 256;

      ctx.clearRect(0, 0, 256, 256);

      const imgRatio = img.width / img.height;
      let renderW = 256;
      let renderH = 256;
      if (imgRatio > 1) {
        renderH = 256;
        renderW = 256 * imgRatio;
      } else {
        renderW = 256;
        renderH = 256 / imgRatio;
      }

      ctx.save();
      // Center coordinates
      ctx.translate(128, 128);
      // User manual drag translate
      ctx.translate(offset.x, offset.y);
      // Zoom
      ctx.scale(zoom, zoom);

      // Render image centered
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      // Compress to 80% JPEG quality
      const croppedUrl = canvas.toDataURL("image/jpeg", 0.8);
      setUserAvatar(croppedUrl);
      setShowCropper(false);
      setCropperSrc("");
    };
  };

  // AI Recommendation form
  const [recommendationMood, setRecommendationMood] = useState("chill");
  const [recommendationGenre, setRecommendationGenre] = useState("synthwave");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  // Playlist creators state
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(true);
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get all unique known songs across songsList and playlists
  const allKnownSongs = React.useMemo(() => {
    const songMap = new Map<string, Song>();
    songsList.forEach(s => songMap.set(s.id, s));
    playlists.forEach(p => p.songs.forEach(s => {
      if (!songMap.has(s.id)) {
        songMap.set(s.id, s);
      }
    }));
    if (currentSong && !songMap.has(currentSong.id)) {
      songMap.set(currentSong.id, currentSong);
    }
    return Array.from(songMap.values());
  }, [songsList, playlists, currentSong]);

  // Filter and sort YouTube imported songs
  const importedSongs = React.useMemo(() => {
    return songsList
      .filter(song => song.source === "YouTube")
      .sort((a, b) => (b.importedAt || 0) - (a.importedAt || 0));
  }, [songsList]);

  // Search suggestions result computation
  const searchResultsSongs = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.toLowerCase();
    return allKnownSongs.filter(song => 
      song.title.toLowerCase().includes(term) ||
      song.artist.toLowerCase().includes(term) ||
      (song.album && song.album.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [searchQuery, allKnownSongs]);

  const searchResultsPlaylists = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.toLowerCase();
    return playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(term) ||
      (playlist.description && playlist.description.toLowerCase().includes(term))
    ).slice(0, 3);
  }, [searchQuery, playlists]);

  // Global click & contextmenu listener to close the custom context menu
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
    };
  }, [contextMenu.visible]);

  const isFetchingRemote = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchMovedRef = useRef<boolean>(false);
  const lastLongPressTimeRef = useRef<number>(0);

  const getSongTouchHandlers = (song: Song, fromPlaylistId: string | null = null) => {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        touchMovedRef.current = false;
        const touch = e.touches[0];
        touchStartCoordsRef.current = { x: touch.clientX, y: touch.clientY };

        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
          if (!touchMovedRef.current) {
            lastLongPressTimeRef.current = Date.now();
            
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }

            setContextMenu({
              visible: true,
              x: touchStartCoordsRef.current.x,
              y: touchStartCoordsRef.current.y,
              song,
              playlist: null,
              type: "song",
              fromPlaylistId
            });
          }
        }, 600);
      },
      onTouchMove: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const diffX = Math.abs(touch.clientX - touchStartCoordsRef.current.x);
        const diffY = Math.abs(touch.clientY - touchStartCoordsRef.current.y);
        
        if (diffX > 10 || diffY > 10) {
          touchMovedRef.current = true;
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      },
      onTouchEnd: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },
      onTouchCancel: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };
  };

  // Load user data from Firestore when authenticated
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return;

    const fetchUserData = async () => {
      isFetchingRemote.current = true;
      try {
        const userDocRef = doc(db, "users", userEmail);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.songsList) setSongsList(data.songsList);
          if (data.playlists) setPlaylists(data.playlists);
          if (data.folders) setFolders(data.folders);
          if (data.favorites) setFavorites(data.favorites);
          if (data.history) setHistory(data.history);
          if (data.unlockedAchievements) setUnlockedAchievements(data.unlockedAchievements);
          
          // Profile details
          if (data.userName) setUserName(data.userName);
          if (data.userDesc) setUserDesc(data.userDesc);
          if (data.userAvatar) setUserAvatar(data.userAvatar);
          if (data.listeningHours !== undefined) setListeningHours(data.listeningHours);
          if (data.playCounts) setPlayCounts(data.playCounts);
          if (data.weeklyListening) setWeeklyListening(data.weeklyListening);
        } else {
          // New user document: initialize with current state values
          await setDoc(userDocRef, {
            songsList,
            playlists,
            folders,
            favorites,
            history,
            unlockedAchievements,
            userName,
            userDesc,
            userAvatar,
            listeningHours,
            playCounts,
            weeklyListening
          });
        }
      } catch (err: any) {
        if (err?.message?.includes("offline") || err?.code === "unavailable" || err?.message?.includes("Failed to get document")) {
          console.warn("Firestore offline mode or connection issue detected. Relying on local persistence.");
        } else {
          console.error("Error loading user data from Firestore:", err);
        }
      } finally {
        isFetchingRemote.current = false;
      }
    };

    fetchUserData();
  }, [isLoggedIn, userEmail]);

  // Sync to LocalStorage on modifications
  useEffect(() => {
    localStorage.setItem("velvet_songs", JSON.stringify(songsList));
  }, [songsList]);

  useEffect(() => {
    localStorage.setItem("velvet_playlists", JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem("velvet_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("velvet_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("velvet_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("velvet_achievements", JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements]);

  // Sync to Cloud Firestore when modified (debounced)
  useEffect(() => {
    if (!isLoggedIn || !userEmail || isFetchingRemote.current) return;

    const saveUserData = async () => {
      try {
        const userDocRef = doc(db, "users", userEmail);
        await setDoc(userDocRef, {
          songsList,
          playlists,
          folders,
          favorites,
          history,
          unlockedAchievements,
          userName,
          userDesc,
          userAvatar,
          listeningHours,
          playCounts,
          weeklyListening
        }, { merge: true });
      } catch (err: any) {
        if (err?.message?.includes("offline") || err?.code === "unavailable" || err?.message?.includes("Failed to get document")) {
          console.warn("Firestore offline mode or connection issue detected. Cloud sync will resume when online.");
        } else {
          console.error("Error saving user data to Firestore:", err);
        }
      }
    };

    const timeout = setTimeout(saveUserData, 1000);
    return () => clearTimeout(timeout);
  }, [songsList, playlists, folders, favorites, history, unlockedAchievements, userName, userDesc, userAvatar, listeningHours, playCounts, weeklyListening, isLoggedIn, userEmail]);

  // Real-time play tracking: increment listening hours and weekly trends every second
  useEffect(() => {
    if (!isPlaying || !currentSong) return;

    const interval = setInterval(() => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDay = days[new Date().getDay()];
      
      const incrementValue = 1 / 3600; // 1 second in hours

      setListeningHours(prev => prev + incrementValue);
      setWeeklyListening(prev => ({
        ...prev,
        [currentDay]: (prev[currentDay] || 0) + incrementValue
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSong]);

  // Achievement unlock triggers
  const unlockAchievement = (id: string) => {
    if (!unlockedAchievements.includes(id)) {
      const updated = [...unlockedAchievements, id];
      setUnlockedAchievements(updated);
      
      // Trigger VIP achievement if all previous ones are unlocked
      const previousIds = ["a1", "a2", "a3", "a4"];
      const hasAllOthers = previousIds.every(pId => pId === id || updated.includes(pId));
      if (hasAllOthers && !updated.includes("a5")) {
        setUnlockedAchievements([...updated, "a5"]);
      }
    }
  };

  // Track playback controllers
  const handlePlaySong = (song: Song) => {
    if (song.isUnavailable) {
      setActiveSongView(song);
      return;
    }
    if (song.source === "YouTube") {
      setYtPlaybackTrigger(prev => prev + 1);
    }
    setCurrentSong(song);
    setIsPlaying(true);
    unlockAchievement("a1");

    // Add to history
    const filteredHistory = history.filter(h => h.id !== song.id);
    setHistory([song, ...filteredHistory.slice(0, 9)]);

    // Update play stats
    setPlayCounts(prev => ({
      ...prev,
      [song.id]: (prev[song.id] || 0) + 1
    }));
    setListeningHours(prev => prev + 0.05);
  };

  const handlePlayPauseToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      setQueue(queue.slice(1));
      handlePlaySong(nextSong);
    } else {
      // Loop over index list
      const currentIndex = songsList.findIndex(s => s.id === currentSong?.id);
      if (currentIndex !== -1 && currentIndex < songsList.length - 1) {
        handlePlaySong(songsList[currentIndex + 1]);
      } else {
        handlePlaySong(songsList[0]);
      }
    }
  };

  const handlePrev = () => {
    const currentIndex = songsList.findIndex(s => s.id === currentSong?.id);
    if (currentIndex > 0) {
      handlePlaySong(songsList[currentIndex - 1]);
    } else {
      handlePlaySong(songsList[songsList.length - 1]);
    }
  };

  const handleAddSongToQueue = (song: Song) => {
    setQueue([...queue, song]);
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) {
      handlePlaySong(playlist.songs[0]);
      setQueue(playlist.songs.slice(1));
    }
  };

  const handleShufflePlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) {
      const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
      handlePlaySong(shuffled[0]);
      setQueue(shuffled.slice(1));
    }
  };

  const toggleFavorite = (songId: string) => {
    if (favorites.includes(songId)) {
      setFavorites(favorites.filter(id => id !== songId));
    } else {
      setFavorites([...favorites, songId]);
    }
  };

  // YouTube live duration sync from player
  const handleUpdateYtDuration = (songId: string, durationSeconds: number) => {
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);
    const durationStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

    setSongsList(prev => prev.map(song => 
      song.id === songId ? { ...song, duration: durationStr } : song
    ));
  };

  // YouTube Link Importer
  const handleImportYouTube = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setYtImportError(null);
    setYtImportSuccess(null);

    const trimmedUrl = ytImportUrl.trim();
    if (!trimmedUrl) {
      setYtImportError("Please paste a valid YouTube URL.");
      return;
    }

    // Regex matching youtu.be or youtube.com video IDs
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmedUrl.match(ytRegex);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      setYtImportError("Invalid YouTube URL. Please enter a valid watch or share link.");
      return;
    }

    // Check for duplicates
    const isDuplicate = songsList.some(song => song.videoId === videoId || song.id === `yt-${videoId}`);
    if (isDuplicate) {
      setYtImportError("This YouTube video has already been imported!");
      return;
    }

    setYtImportLoading(true);

    try {
      // Free CORS-enabled oEmbed API to get metadata securely
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      let title = "YouTube Video";
      let channel = "YouTube Creator";
      let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      if (response.ok) {
        const data = await response.json();
        title = data.title || title;
        channel = data.author_name || channel;
        if (data.thumbnail_url) {
          thumbnail = data.thumbnail_url;
        }
      }

      const newSong: Song = {
        id: `yt-${videoId}`,
        videoId: videoId,
        title: title,
        artist: channel,
        album: "YouTube Import",
        artwork: thumbnail,
        duration: "--:--", // updated when the song begins playback
        audioUrl: "", // handled by YouTube Player API
        source: "YouTube",
        importedAt: Date.now()
      };

      setSongsList(prev => [newSong, ...prev]);
      setYtImportSuccess(`Successfully imported "${title}"!`);
      setYtImportUrl("");

      // Play the song immediately!
      handlePlaySong(newSong);

    } catch (err) {
      console.error("Error importing YouTube link:", err);
      setYtImportError("Unable to fetch video details. Please try again.");
    } finally {
      setYtImportLoading(false);
    }
  };

  const handleSongContextMenu = (e: React.MouseEvent, song: Song, fromPlaylistId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      song,
      playlist: null,
      type: "song",
      fromPlaylistId
    });
  };

  const handlePlaylistContextMenu = (e: React.MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      song: null,
      playlist,
      type: "playlist",
      fromPlaylistId: null
    });
  };

  const handleQuickCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPlaylistName.trim()) return;

    const newPlaylist: Playlist = {
      id: `custom-playlist-${Date.now()}`,
      name: quickPlaylistName.trim(),
      description: "A custom curated list of tracks.",
      artwork: quickCreatePlaylistSong?.artwork || SEED_SONGS[0].artwork,
      songs: quickCreatePlaylistSong ? [quickCreatePlaylistSong] : [],
      isPublic: true,
      owner: "Drishti (You)",
      likes: 0,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };

    setPlaylists([newPlaylist, ...playlists]);
    setQuickPlaylistName("");
    setShowQuickCreateModal(false);
    setQuickCreatePlaylistSong(null);
  };

  const handleAddSongToPlaylist = (song: Song, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const exists = p.songs.some(s => s.id === song.id);
        if (exists) return p;
        return {
          ...p,
          songs: [...p.songs, song]
        };
      }
      return p;
    }));
  };

  const handleRemoveSongFromPlaylist = (songId: string, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          songs: p.songs.filter(s => s.id !== songId)
        };
      }
      return p;
    }));
  };

  const handleUpdatePlaylistArtwork = (playlistId: string, artworkUrl: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, artwork: artworkUrl };
      }
      return p;
    }));
  };

  const handleUpdatePlaylistNameAndDesc = (playlistId: string, name: string, desc: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, name, description: desc };
      }
      return p;
    }));
  };

  const handleConfirmDeleteSong = (songId: string) => {
    setSongsList(prev => prev.filter(s => s.id !== songId));
    setHistory(prev => prev.filter(s => s.id !== songId));
    setFavorites(prev => prev.filter(id => id !== songId));
    setPlaylists(prev => prev.map(p => ({
      ...p,
      songs: p.songs.filter(s => s.id !== songId)
    })));
    if (currentSong?.id === songId) {
      setCurrentSong(null);
      setIsPlaying(false);
    }
    setQueue(prev => prev.filter(s => s.id !== songId));
  };

  const handleDeleteYtSong = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const song = songsList.find(s => s.id === songId);
    if (song) {
      setDeleteConfirmSong(song);
    }
  };

  const handleRenameYtSong = (songId: string, newTitle: string) => {
    setSongsList(prev => prev.map(song => 
      song.id === songId ? { ...song, title: newTitle, customTitle: newTitle } : song
    ));
  };

  // Universal Link playlist imports
  const handleImportPlaylist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importUrl) return;

    setImportLoading(true);
    setImportStatus("Poking platform nodes...");

    try {
      const res = await fetch("/api/gemini/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl })
      });
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        setImportStatus("Curation parsed successfully!");
        
        // Add parsed songs to our general listing
        const newSongs: Song[] = result.data.map((track: any, i: number) => ({
          id: `imported-${Date.now()}-${i}`,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", // Use working stream
          source: result.source,
          sourceUrl: track.sourceUrl,
          artwork: track.artwork || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
          isUnavailable: track.isUnavailable || false,
          replacementQuery: track.replacementQuery || `${track.artist} ${track.title}`,
          lyrics: `[Verse 1]\nSynthetic horizons are falling down\nInto the heart of this neon town\nYou matched a link from ${result.source} today\nAnd imported these velvet vibrations to play.`,
          artistBio: `${track.artist} is an active indie musician featured in imported playlists on ${result.source}.`
        }));

        setSongsList(prev => [...newSongs, ...prev]);

        // Create a dedicated playlist
        const createdPlaylist: Playlist = {
          id: `playlist-import-${Date.now()}`,
          name: `Imported from ${result.source}`,
          description: `AI-parsed track listing from ${importUrl}`,
          artwork: newSongs[0].artwork,
          songs: newSongs,
          isPublic: true,
          owner: "Drishti (You)",
          likes: 0
        };

        setPlaylists(prev => [createdPlaylist, ...prev]);
        setImportUrl("");
        setImportStatus("Playlist cataloged!");
        setActiveTab("library");
        unlockAchievement("a2");
      } else {
        setImportStatus("Import failed. Trying simulation.");
      }
    } catch (err) {
      console.error(err);
      setImportStatus("Error occurred. Please try again.");
    } finally {
      setImportLoading(false);
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  // Home Link playlist imports
  const handleHomeImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeImportUrl) return;

    setHomeImportLoading(true);
    setHomeImportStatus("Mapping network nodes & parsing playlist...");

    try {
      const res = await fetch("/api/gemini/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: homeImportUrl })
      });
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        setHomeImportStatus("Vibrations fetched successfully!");
        
        // Helper for distinct working audio paths
        const getDeterministicAudioUrl = (title: string, index: number) => {
          let hash = 0;
          const combined = title + index;
          for (let k = 0; k < combined.length; k++) {
            hash += combined.charCodeAt(k);
          }
          const songNumber = (hash % 16) + 1;
          return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songNumber}.mp3`;
        };

        // Add parsed songs to our general listing
        const newSongs: Song[] = result.data.map((track: any, i: number) => ({
          id: `imported-home-${Date.now()}-${i}`,
          title: track.title,
          artist: track.artist,
          album: track.album || "Web Wave",
          duration: track.duration || "3:30",
          audioUrl: getDeterministicAudioUrl(track.title, i),
          source: result.source,
          sourceUrl: track.sourceUrl || homeImportUrl,
          artwork: track.artwork || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
          isUnavailable: track.isUnavailable || false,
          replacementQuery: track.replacementQuery || `${track.artist} ${track.title}`,
          lyrics: track.lyrics || `[Verse 1]\nSynthetic horizons are falling down\nInto the heart of this neon town\nYou matched a link from ${result.source} today\nAnd imported these velvet vibrations to play.`,
          artistBio: track.artistBio || `${track.artist} is an active indie musician featured in imported playlists on ${result.source}.`
        }));

        setSongsList(prev => [...newSongs, ...prev]);

        // Create a dedicated playlist
        const isSingle = newSongs.length === 1;
        const playlistName = isSingle 
          ? `${newSongs[0].title} (Imported)`
          : `Imported from ${result.source}`;
        const playlistDesc = isSingle
          ? `Single track by ${newSongs[0].artist} imported from ${result.source}`
          : `AI-parsed track listing from ${homeImportUrl}`;

        const createdPlaylist: Playlist = {
          id: `playlist-import-${Date.now()}`,
          name: playlistName,
          description: playlistDesc,
          artwork: newSongs[0].artwork,
          songs: newSongs,
          isPublic: true,
          owner: "Drishti (You)",
          likes: 0
        };

        setPlaylists(prev => [createdPlaylist, ...prev]);
        setLatestConvertedPlaylist(createdPlaylist);
        setHomeImportStatus("Playlist fully converted!");
        unlockAchievement("a2");
      } else {
        setHomeImportStatus("Conversion failed. Please verify the URL.");
      }
    } catch (err) {
      console.error(err);
      setHomeImportStatus("Error converting playlist. Please check your network.");
    } finally {
      setHomeImportLoading(false);
    }
  };

  // Quick detect when paste in hero
  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    const lowercase = searchQuery.toLowerCase();
    const isLink = lowercase.startsWith("http") || lowercase.includes("youtube.com") || lowercase.includes("spotify.com") || lowercase.includes("apple.com") || lowercase.includes("soundcloud.com");

    if (isLink) {
      setImportUrl(searchQuery);
      setSearchQuery("");
      setActiveTab("library");
      // Scroll to import panel
      setTimeout(() => {
        document.getElementById("import-section-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      setActiveTab("discover");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  // AI recommendations caller
  const handleFetchRecommendations = async () => {
    setRecommendationLoading(true);
    try {
      const res = await fetch("/api/gemini/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: recommendationMood, genre: recommendationGenre })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiRecommendations(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Create manual playlists
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const added: Playlist = {
      id: `custom-playlist-${Date.now()}`,
      name: newPlaylistName,
      description: newPlaylistDesc || "A custom curated list of songs.",
      artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", // Default beautiful template artwork
      songs: [], // Empty initially so users can curate
      isPublic: newPlaylistIsPublic,
      owner: "Drishti (You)",
      likes: 0,
      collaborators: [],
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };

    const updated = [added, ...playlists];
    setPlaylists(updated);
    
    // Check if custom playlists have reached 3
    const customCount = updated.filter(p => p.owner === "Drishti (You)").length;
    if (customCount >= 3) {
      unlockAchievement("a3");
    }

    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setShowPlaylistForm(false);
  };

  // Create folders
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const added: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      playlistIds: []
    };

    setFolders([...folders, added]);
    setNewFolderName("");
    setShowFolderForm(false);
  };

  const addPlaylistToFolder = (playlistId: string, folderId: string) => {
    setFolders(folders.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          playlistIds: f.playlistIds.includes(playlistId) ? f.playlistIds : [...f.playlistIds, playlistId]
        };
      }
      return f;
    }));
  };

  // Remove playlists
  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylists(playlists.filter(p => p.id !== id));
  };

  // Direct genre select from tag
  const handleGenreSelect = (genre: string) => {
    setRecommendationGenre(genre);
    setActiveTab("discover");
    handleFetchRecommendations();
  };

  // Filter songs by search text
  const filteredSongs = songsList.filter(song => {
    const term = searchQuery.toLowerCase();
    return song.title.toLowerCase().includes(term) || 
           song.artist.toLowerCase().includes(term) || 
           song.album.toLowerCase().includes(term);
  });

  const handleNavSearchClick = () => {
    setActiveTab("discover");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  const handleSelectSearchResult = (type: "song" | "playlist", id: string) => {
    setShowSearchSuggestions(false);
    setSearchQuery("");

    if (type === "playlist") {
      setSelectedPlaylistId(id);
      setActiveTab("playlist");
      setTimeout(() => {
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 150);
    } else if (type === "song") {
      const song = allKnownSongs.find(s => s.id === id);
      if (!song) return;
      handlePlaySong(song);

      let targetTab: "discover" | "favorites" | "imported" = "discover";
      let targetId = `catalog-card-${song.id}`;

      if (favorites.includes(song.id)) {
        targetTab = "favorites";
        targetId = `favorite-list-item-${song.id}`;
      } else if (song.source === "YouTube") {
        targetTab = "imported";
        targetId = `imported-list-item-${song.id}`;
      }

      setActiveTab(targetTab);
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-pink-500", "scale-[1.02]", "transition-all", "duration-500");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-pink-500", "scale-[1.02]");
          }, 2500);
        }
      }, 250);
    }
  };

  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 25; // Slow parallax translation
      const y = (e.clientY / window.innerHeight - 0.5) * 25;
      setMouseCoords({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Card interactive mouse move highlights & gentle 3-5deg tilt
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--mouse-y", `${(y / rect.height) * 100}%`);
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -4; // -4 to 4 degrees
    const tiltY = ((x - centerX) / centerX) * 4; // -4 to 4 degrees
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale(1.015)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
  };

  const accentRgbStr = hexToRgbStr(themeAccent);
  const accentHoverStr = darkenColorHex(themeAccent, 12);

  return (
    <div className="min-h-screen bg-black text-white/90 relative flex flex-col font-sans overflow-hidden selection:bg-white/10 selection:text-white">
      
      {/* DYNAMIC PERSONALIZATION STYLES */}
      <style>{`
        :root {
          --accent-color: ${themeAccent};
          --accent-color-rgb: ${accentRgbStr};
          --accent-hover: ${accentHoverStr};
          --blob-color-1: ${themeBlob1};
          --blob-color-2: ${themeBlob2};
        }

        /* Dynamically override standard tailwind text-pink classes */
        .text-pink-500, .text-pink-400, .text-pink-400\\/80, .text-pink-300 {
          color: var(--accent-color) !important;
        }
        
        .group-hover\\:text-pink-400:hover, .group:hover .group-hover\\:text-pink-400 {
          color: var(--accent-color) !important;
        }
        .hover\\:text-pink-400:hover, .hover\\:text-pink-300:hover {
          color: var(--accent-color) !important;
        }
        
        /* Background and hover overrides */
        .bg-pink-500, .bg-pink-600 {
          background-color: var(--accent-color) !important;
        }
        .hover\\:bg-pink-500:hover, .hover\\:bg-pink-600:hover {
          background-color: var(--accent-hover) !important;
        }
        
        /* Transparent variants */
        .bg-pink-500\\/10 {
          background-color: rgba(var(--accent-color-rgb), 0.1) !important;
        }
        .bg-pink-500\\/20 {
          background-color: rgba(var(--accent-color-rgb), 0.2) !important;
        }
        .hover\\:bg-pink-500\\/10:hover {
          background-color: rgba(var(--accent-color-rgb), 0.1) !important;
        }
        .hover\\:bg-pink-500\\/20:hover {
          background-color: rgba(var(--accent-color-rgb), 0.2) !important;
        }
        
        /* Border and ring overrides */
        .border-pink-500, .border-pink-500\\/25, .border-pink-500\\/20, .border-pink-500\\/10, .border-pink-500\\/30 {
          border-color: rgba(var(--accent-color-rgb), 0.3) !important;
        }
        .focus\\:border-pink-500\\/50:focus {
          border-color: var(--accent-color) !important;
        }
        .ring-pink-500 {
          --tw-ring-color: var(--accent-color) !important;
        }
        
        /* Brand SVG overrides */
        svg circle[fill="#FF006E"], svg path[fill="#FF006E"] {
          fill: var(--accent-color) !important;
        }
        
        /* Giant colorful dynamic blobs */
        .blob-pink-vibrant {
          background: radial-gradient(circle, rgba(var(--blob-color-1), 0.8) 0%, rgba(var(--blob-color-1), 0.5) 35%, rgba(var(--blob-color-2), 0.15) 65%, rgba(var(--blob-color-2), 0) 100%) !important;
        }
        .blob-orange-vibrant {
          background: radial-gradient(circle, rgba(var(--blob-color-2), 0.8) 0%, rgba(var(--blob-color-1), 0.4) 40%, rgba(var(--blob-color-1), 0.1) 70%, rgba(var(--blob-color-1), 0) 100%) !important;
        }
      `}</style>
      
      {/* GLASSMORPHISM LOGIN OVERLAY FOR UNAUTHENTICATED USERS */}
      {!isLoggedIn && showLoginOverlay && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onBack={() => {
            setShowLoginOverlay(false);
            setActiveTab("home");
          }}
        />
      )}
      
      {/* GLOBAL LUXURY AMBIENT LAYER: MOVING BRIGHT COLOURED BLOB PARALLAX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-black">
        {/* Giant separate colorful pink/orange blobs */}
        {/* Prominent Pink/Purple Blob (Upper Left) */}
        <div 
          className="absolute top-[5%] left-[5%] w-[45vw] h-[45vw] md:w-[35vw] md:h-[35vw] rounded-full blob-pink-vibrant opacity-95 blur-[60px] md:blur-[80px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseCoords.x * 1.5}px, ${mouseCoords.y * 1.5}px)`
          }}
        ></div>

        {/* Prominent Orange Blob (Bottom Right) */}
        <div 
          className="absolute bottom-[8%] right-[8%] w-[48vw] h-[48vw] md:w-[38vw] md:h-[38vw] rounded-full blob-orange-vibrant opacity-90 blur-[70px] md:blur-[90px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseCoords.x * -1.2}px, ${mouseCoords.y * -1.2}px)`
          }}
        ></div>

        {/* Small Orange Accent Dot (Bottom Left) */}
        <div 
          className="absolute bottom-[20%] left-[12%] w-6 h-6 rounded-full neon-dot-glow-orange opacity-100 blur-[4px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseCoords.x * -0.5}px, ${mouseCoords.y * 0.5}px)`
          }}
        ></div>

        {/* Small Purple Accent Dot (Upper Right) */}
        <div 
          className="absolute top-[25%] right-[15%] w-8 h-8 rounded-full neon-dot-glow-purple opacity-95 blur-[6px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${mouseCoords.x * 0.8}px, ${mouseCoords.y * -0.8}px)`
          }}
        ></div>

        {/* Subtle dark vignette overlay to make text pop but keep blobs super vibrant */}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Floating Microparticles */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>

      <div className="app flex flex-col md:flex-row h-screen w-full overflow-hidden select-none relative z-10">
        
        {/* LEFT SIDEBAR */}
        <aside className="sidebar w-64 bg-black/45 backdrop-blur-3xl border-r border-white/5 hidden md:flex flex-col p-6 overflow-y-auto shrink-0 z-10">
          
          <div 
            className="logo font-display text-sm font-extrabold tracking-[0.3em] text-white flex items-center gap-2 mb-8 uppercase cursor-pointer"
            onClick={() => setActiveTab("home")}
            id="velvet-brand-logo"
          >
            <svg viewBox="0 0 100 100" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="50" fill="#FF006E" />
              <g transform="rotate(-45 50 50)">
                <rect x="36" y="-10" width="28" height="120" fill="white" rx="4" />
              </g>
              <circle cx="50" cy="50" r="33" fill="#FF006E" />
              <circle cx="50" cy="50" r="25" fill="white" />
              <path 
                d="M50 42 C47 37, 38 37, 38 46 C38 53, 46 58, 50 62 C54 58, 62 53, 62 46 C62 37, 53 37, 50 42 Z" 
                fill="#FF006E" 
              />
            </svg>
            <span>VELVETO</span>
          </div>

          <nav className="navigation flex flex-col gap-1.5 text-xs font-semibold tracking-widest uppercase mb-8">
            <a 
              id="nav-home"
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "home" ? "bg-white/10 text-white font-semibold shadow-inner" : "text-white/40 hover:text-white"}`}
            >
              <Compass className="w-4 h-4" /> Home
            </a>
            <a 
              id="nav-playlists-link"
              onClick={() => { setActiveTab("library"); setShowPlaylistForm(true); }}
              className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-white/40 hover:text-white"
            >
              <PlusCircle className="w-4 h-4" /> Playlists
            </a>
            <a 
              id="nav-favorites-link"
              onClick={() => { setActiveTab("favorites"); }}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "favorites" ? "bg-white/10 text-white font-semibold shadow-inner" : "text-white/40 hover:text-white"}`}
            >
              <Heart className="w-4 h-4" /> Favorites
            </a>
            <a 
              id="nav-albums-link"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeTab === "profile" ? "bg-white/10 text-white font-semibold shadow-inner" : "text-white/40 hover:text-white"}`}
            >
              <User className="w-4 h-4" /> Profile
            </a>
          </nav>

          {/* PLAYLIST / THEME PERSONALIZATION SECTION */}
          <div className="playlist-list flex flex-col gap-3 mb-8 border-t border-white/5 pt-6 overflow-y-auto min-h-[220px]">
            <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2">
              <span 
                onClick={() => setSidebarTab("playlists")}
                className={`text-[9px] font-mono tracking-widest uppercase cursor-pointer transition-all ${sidebarTab === "playlists" ? "text-pink-400 font-semibold border-b border-pink-500 pb-1" : "text-white/30 hover:text-white"}`}
              >
                Playlists
              </span>
              <span 
                onClick={() => setSidebarTab("theme")}
                className={`text-[9px] font-mono tracking-widest uppercase cursor-pointer transition-all ${sidebarTab === "theme" ? "text-pink-400 font-semibold border-b border-pink-500 pb-1" : "text-white/30 hover:text-white"}`}
              >
                Personalize
              </span>
            </div>

            {sidebarTab === "playlists" ? (
              <div className="flex flex-col gap-2.5">
                {playlists.slice(0, 5).map((playlist) => (
                  <div 
                    key={playlist.id} 
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      setActiveTab("playlist");
                    }}
                    onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                    className="playlist-card group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all text-left"
                  >
                    <img src={playlist.artwork} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/5" alt="" referrerPolicy="no-referrer" />
                    <div className="truncate">
                      <p className="text-[11px] font-semibold text-white truncate leading-tight group-hover:text-pink-400 transition-colors">{playlist.name}</p>
                      <p className="text-[9px] text-white/35 font-mono truncate">{playlist.songs.length} tracks</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* PRESETS GRID */}
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-mono tracking-wider text-white/40 uppercase">Themes</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {THEME_PRESETS.map((p) => {
                      const isSelected = themeAccent === p.accent && themeBlob1 === p.blob1;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setThemeAccent(p.accent);
                            setThemeBlob1(p.blob1);
                            setThemeBlob2(p.blob2);
                            setThemeName(p.name);
                          }}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                            isSelected 
                              ? "bg-white/[0.04] border-pink-500/50" 
                              : "bg-transparent border-white/5 hover:border-white/10"
                          }`}
                          title={p.name}
                        >
                          <div className="flex gap-0.5 items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: p.accent }}></span>
                            <span className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: `rgb(${p.blob1})` }}></span>
                            <span className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: `rgb(${p.blob2})` }}></span>
                          </div>
                          <span className="text-[7.5px] font-mono truncate max-w-full text-white/60 leading-none">{p.name.split(" ")[1]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CUSTOM COLOR ADJUSTERS */}
                <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
                  <span className="text-[8px] font-mono tracking-wider text-white/40 uppercase">Customizer</span>
                  
                  {/* ACCENT COLOR */}
                  <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-2">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-medium text-white/70">Accent Color</span>
                      <span className="text-[8px] font-mono text-white/30 uppercase">{themeAccent}</span>
                    </div>
                    <label className="relative cursor-pointer shrink-0">
                      <input 
                        type="color" 
                        value={themeAccent}
                        onChange={(e) => {
                          const hex = e.target.value;
                          setThemeAccent(hex);
                          setThemeName("Custom");
                        }}
                        className="sr-only"
                      />
                      <div className="w-6 h-6 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: themeAccent }} />
                    </label>
                  </div>

                  {/* LEFT BLOB COLOR */}
                  <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-2">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-medium text-white/70">Left Glow Blob</span>
                      <span className="text-[8px] font-mono text-white/30 uppercase">
                        rgb({themeBlob1})
                      </span>
                    </div>
                    <label className="relative cursor-pointer shrink-0">
                      <input 
                        type="color" 
                        value={`#${themeBlob1.split(",").map(v => {
                          const num = parseInt(v.trim());
                          return isNaN(num) ? "00" : num.toString(16).padStart(2, "0");
                        }).join("")}`}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const rgb = hexToRgbStr(hex);
                          setThemeBlob1(rgb);
                          setThemeName("Custom");
                        }}
                        className="sr-only"
                      />
                      <div className="w-6 h-6 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: `rgb(${themeBlob1})` }} />
                    </label>
                  </div>

                  {/* RIGHT BLOB COLOR */}
                  <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-2">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-medium text-white/70">Right Glow Blob</span>
                      <span className="text-[8px] font-mono text-white/30 uppercase">
                        rgb({themeBlob2})
                      </span>
                    </div>
                    <label className="relative cursor-pointer shrink-0">
                      <input 
                        type="color" 
                        value={`#${themeBlob2.split(",").map(v => {
                          const num = parseInt(v.trim());
                          return isNaN(num) ? "00" : num.toString(16).padStart(2, "0");
                        }).join("")}`}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const rgb = hexToRgbStr(hex);
                          setThemeBlob2(rgb);
                          setThemeName("Custom");
                        }}
                        className="sr-only"
                      />
                      <div className="w-6 h-6 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: `rgb(${themeBlob2})` }} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>



        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="main-content flex-1 overflow-y-auto px-4 py-5 md:p-10 pb-44 md:pb-32 flex flex-col gap-6 md:gap-8 select-none relative z-10">
          
          {/* MOBILE ONLY TOP BAR */}
          <header className="mobile-topbar flex md:hidden items-center justify-between px-1.5 py-1 border-b border-white/5 mb-2 w-full shrink-0">
            <div 
              className="logo font-display text-sm font-extrabold tracking-[0.2em] text-white flex items-center gap-2 uppercase cursor-pointer animate-fade-in"
              onClick={() => setActiveTab("home")}
            >
              <svg viewBox="0 0 100 100" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="#FF006E" />
                <g transform="rotate(-45 50 50)">
                  <rect x="36" y="-10" width="28" height="120" fill="white" rx="4" />
                </g>
                <circle cx="50" cy="50" r="33" fill="#FF006E" />
                <circle cx="50" cy="50" r="25" fill="white" />
                <path 
                  d="M50 42 C47 37, 38 37, 38 46 C38 53, 46 58, 50 62 C54 58, 62 53, 62 46 C62 37, 53 37, 50 42 Z" 
                  fill="#FF006E" 
                />
              </svg>
              <span>VELVETO</span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setActiveTab("home");
                  setTimeout(() => {
                    const searchInput = document.getElementById("mobile-search-input");
                    if (searchInput) {
                      searchInput.scrollIntoView({ behavior: 'smooth' });
                      searchInput.focus();
                    }
                  }, 100);
                }}
                className="p-2 bg-white/[0.04] border border-white/5 rounded-full text-white/70 hover:text-white"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <div 
                className="w-7 h-7 rounded-full overflow-hidden border border-white/15 flex items-center justify-center bg-white/10 cursor-pointer"
                onClick={() => setActiveTab("profile")}
              >
                {userAvatar ? (
                  <img src={userAvatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-3.5 h-3.5 text-white/60" />
                )}
              </div>
            </div>
          </header>

          {/* DESKTOP ONLY TOP HEADER */}
          <header className="topbar hidden md:flex items-center justify-between">
            
            {/* SEARCH BAR */}
            <div className="search-bar relative flex items-center bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl w-80 p-1 transition-all">
              <Search className="w-4 h-4 text-white/35 ml-4 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                placeholder="Search for songs, artists, albums..."
                className="w-full bg-transparent text-white text-xs px-3.5 py-2 outline-none placeholder-white/30 font-light"
              />
              {showSearchSuggestions && searchQuery.trim() !== "" && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-50 animate-scale-up max-h-96 overflow-y-auto scrollbar-thin">
                  {searchResultsSongs.length === 0 && searchResultsPlaylists.length === 0 ? (
                    <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest text-center py-4">No frequencies found</p>
                  ) : (
                    <>
                      {searchResultsSongs.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1 border-b border-white/5 pb-1">Songs</h4>
                          {searchResultsSongs.map((song) => (
                            <div 
                              key={song.id}
                              onClick={() => handleSelectSearchResult("song", song.id)}
                              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-white/5">
                                <img src={song.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="truncate flex-1 text-left">
                                <p className="text-white text-xs font-medium truncate font-display group-hover:text-pink-400 transition-colors">{song.title}</p>
                                <p className="text-white/40 text-[9px] font-mono uppercase tracking-wider truncate">{song.artist}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResultsPlaylists.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1 border-b border-white/5 pb-1">Playlists</h4>
                          {searchResultsPlaylists.map((playlist) => (
                            <div 
                              key={playlist.id}
                              onClick={() => handleSelectSearchResult("playlist", playlist.id)}
                              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-white/5">
                                <img src={playlist.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="truncate flex-1 text-left">
                                <p className="text-white text-xs font-medium truncate font-display group-hover:text-pink-400 transition-colors">{playlist.name}</p>
                                <p className="text-white/40 text-[9px] font-mono uppercase tracking-wider truncate">{playlist.songs.length} tracks</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="header-actions flex items-center gap-4">

              
              <div 
                className="profile flex items-center gap-3 bg-white/[0.04] border border-white/5 hover:border-white/10 px-3.5 py-1.5 rounded-full cursor-pointer transition-all"
                onClick={() => setActiveTab("profile")}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/15 shrink-0 flex items-center justify-center bg-white/10">
                  {userAvatar ? (
                    <img src={userAvatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-white/60" />
                  )}
                </div>
                <span className="text-xs text-white/80 font-medium font-display leading-none">
                  {isLoggedIn ? userName : "Guest Listener"}
                </span>
              </div>
            </div>

          </header>

          {/* DYNAMIC CONTENTS BY TAB */}
          {activeTab === "home" && (
            <div className="flex flex-col gap-6 md:gap-10 animate-fade-in">
              
              {/* Mobile-Only Search Input Bar */}
              <div className="flex md:hidden w-full relative">
                <div className="search-bar relative flex items-center bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl w-full p-1 transition-all">
                  <Search className="w-4 h-4 text-white/35 ml-3 shrink-0" />
                  <input 
                    id="mobile-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(true);
                    }}
                    onFocus={() => setShowSearchSuggestions(true)}
                    placeholder="Search songs, artists, playlists..."
                    className="w-full bg-transparent text-white text-xs px-3 py-1.5 outline-none placeholder-white/30 font-light"
                  />
                  {showSearchSuggestions && searchQuery.trim() !== "" && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 z-50 max-h-96 overflow-y-auto">
                      {searchResultsSongs.length === 0 && searchResultsPlaylists.length === 0 ? (
                        <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest text-center py-4">No frequencies found</p>
                      ) : (
                        <>
                          {searchResultsSongs.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1 border-b border-white/5 pb-1">Songs</h4>
                              {searchResultsSongs.map((song) => (
                                <div 
                                  key={`mobile-search-song-${song.id}`}
                                  onClick={() => handleSelectSearchResult("song", song.id)}
                                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-white/5">
                                    <img src={song.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  </div>
                                  <div className="truncate flex-1 text-left">
                                    <p className="text-white text-xs font-medium truncate font-display group-hover:text-pink-400 transition-colors">{song.title}</p>
                                    <p className="text-white/40 text-[9px] font-mono uppercase tracking-wider truncate">{song.artist}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {searchResultsPlaylists.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <h4 className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1 border-b border-white/5 pb-1">Playlists</h4>
                              {searchResultsPlaylists.map((playlist) => (
                                <div 
                                  key={`mobile-search-playlist-${playlist.id}`}
                                  onClick={() => handleSelectSearchResult("playlist", playlist.id)}
                                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border border-white/5">
                                    <img src={playlist.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  </div>
                                  <div className="truncate flex-1 text-left">
                                    <p className="text-white text-xs font-medium truncate font-display group-hover:text-pink-400 transition-colors">{playlist.name}</p>
                                    <p className="text-white/40 text-[9px] font-mono uppercase tracking-wider truncate">{playlist.songs.length} tracks</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* GREETING HERO */}
              <section className="hero relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 animate-pulse" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#FF006E" />
                    <g transform="rotate(-45 50 50)">
                      <rect x="36" y="-10" width="28" height="120" fill="white" rx="4" />
                    </g>
                    <circle cx="50" cy="50" r="33" fill="#FF006E" />
                    <circle cx="50" cy="50" r="25" fill="white" />
                    <path 
                      d="M50 42 C47 37, 38 37, 38 46 C38 53, 46 58, 50 62 C54 58, 62 53, 62 46 C62 37, 53 37, 50 42 Z" 
                      fill="#FF006E" 
                    />
                  </svg>
                </div>
                <span className="text-pink-400/80 text-[10px] font-mono uppercase tracking-[0.25em] block mb-2 break-keep whitespace-nowrap">Sonic discovery & ownership</span>
                <h1 className="text-white font-display text-4xl sm:text-5xl font-light tracking-tight select-none leading-none mb-3 break-keep whitespace-nowrap">Velveto</h1>
                <p className="text-white/60 text-xs sm:text-sm font-light uppercase tracking-[0.2em] mb-6 break-keep whitespace-nowrap">Your music forever</p>
                <div className="text-white/40 text-[11px] font-mono flex flex-wrap items-center gap-x-2 gap-y-1.5 break-keep">
                  <span className="whitespace-nowrap">Welcome back, {isLoggedIn ? userName : "Guest Listener"}</span>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <span className="whitespace-nowrap">Streaming 320kbps Master Quality</span>
                </div>
              </section>

              {/* UNIVERSAL PLAYLIST CONVERTER SECTION */}
              <section className="playlist-converter scroll-mt-24">
                <div 
                  className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.02] relative overflow-hidden shadow-xl"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{ transition: "all 0.3s ease" }}
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
                    <Globe className="w-32 h-32 text-white animate-pulse" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9px] font-mono tracking-widest uppercase mb-2 whitespace-nowrap break-keep">
                          <Globe className="w-2.5 h-2.5" /> Velvet Mapper Engine
                        </span>
                        <h2 className="text-white font-display text-base font-semibold uppercase tracking-wider text-white/90 whitespace-nowrap break-keep">Velvet Direct Link Importer</h2>
                        <p className="text-white/40 text-[11px] font-light mt-1 max-w-xl break-keep">
                          Import and play individual YouTube tracks, or convert full playlists from Spotify and SoundCloud.
                        </p>
                      </div>

                      {/* Tab buttons */}
                      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl shrink-0">
                        <button
                          onClick={() => setHomeConverterTab("youtube")}
                          className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all ${
                            homeConverterTab === "youtube" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "text-white/40 hover:text-white"
                          }`}
                        >
                          YouTube Importer
                        </button>
                        <button
                          onClick={() => setHomeConverterTab("playlist")}
                          className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all ${
                            homeConverterTab === "playlist" ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "text-white/40 hover:text-white"
                          }`}
                        >
                          Playlist Converter
                        </button>
                      </div>
                    </div>

                    {/* tab 1: youtube track importer */}
                    {homeConverterTab === "youtube" && (
                      <div className="animate-fade-in">
                        <form onSubmit={handleImportYouTube} className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text"
                            value={ytImportUrl}
                            onChange={(e) => setYtImportUrl(e.target.value)}
                            placeholder="Paste YouTube Link: https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                            className="flex-1 h-[72px] md:h-11 px-5 text-sm md:text-xs text-white bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-xl outline-none focus:border-pink-500/30 focus:bg-white/[0.04] transition-all font-light placeholder:text-white/20"
                          />
                          <button 
                            type="submit"
                            disabled={ytImportLoading}
                            className="h-[72px] md:h-11 px-8 md:px-6 bg-pink-600 hover:bg-pink-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl md:rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
                          >
                            {ytImportLoading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Import Track</span>
                              </>
                            )}
                          </button>
                        </form>

                        {ytImportError && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            <span>{ytImportError}</span>
                          </div>
                        )}

                        {ytImportSuccess && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span>{ytImportSuccess}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* tab 2: universal playlist converter */}
                    {homeConverterTab === "playlist" && (
                      <div className="animate-fade-in">
                        <form onSubmit={handleHomeImportPlaylist} className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text"
                            value={homeImportUrl}
                            onChange={(e) => setHomeImportUrl(e.target.value)}
                            placeholder="Paste Playlist link: https://open.spotify.com/playlist/... or https://youtube.com/playlist?list=..."
                            className="flex-1 h-[72px] md:h-11 px-5 text-sm md:text-xs text-white bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-xl outline-none focus:border-pink-500/30 focus:bg-white/[0.04] transition-all font-light placeholder:text-white/20"
                          />
                          <button 
                            type="submit"
                            disabled={homeImportLoading}
                            className="h-[72px] md:h-11 px-8 md:px-6 bg-pink-600 hover:bg-pink-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl md:rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
                          >
                            {homeImportLoading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Converting...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Convert Playlist</span>
                              </>
                            )}
                          </button>
                        </form>

                        {homeImportStatus && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-pink-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                            <span>{homeImportStatus}</span>
                          </div>
                        )}

                        {/* RENDER THE CONVERTED PLAYLIST AS A GORGEOUS INTERACTIVE PREVIEW */}
                        {latestConvertedPlaylist && (
                          <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-fade-in flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-white/10 shadow-lg">
                                <img src={latestConvertedPlaylist.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <span className="text-[8px] font-mono text-pink-400 uppercase tracking-widest">Successfully Converted</span>
                                <h3 className="text-white font-display font-semibold text-xs tracking-tight mt-0.5">{latestConvertedPlaylist.name}</h3>
                                <p className="text-white/40 text-[10px] font-light mt-0.5">{latestConvertedPlaylist.songs.length} tracks • {latestConvertedPlaylist.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                              <button
                                onClick={() => handlePlayPlaylist(latestConvertedPlaylist)}
                                className="flex-1 md:flex-none h-8.5 px-4 bg-pink-500 hover:bg-pink-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Play</span>
                              </button>
                              <button
                                onClick={() => {
                                  setLatestConvertedPlaylist(null);
                                  setHomeImportUrl("");
                                  setHomeImportStatus(null);
                                }}
                                className="h-8.5 px-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold text-[10px] uppercase tracking-widest rounded-lg flex items-center justify-center transition-all"
                                title="Clear Preview"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* FEATURED / NEWLY IMPORTED */}
              <section className="featured scroll-mt-24">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-white font-display text-sm uppercase tracking-widest font-semibold text-white/80 whitespace-nowrap break-keep">Newly Imported</h2>
                    {importedSongs.length > 5 && (
                      <button 
                        onClick={() => setActiveTab("imported")}
                        className="text-[10px] text-pink-500 hover:text-pink-400 font-mono tracking-widest uppercase bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap break-keep"
                      >
                        See More
                      </button>
                    )}
                  </div>
                  <span className="text-white/20 text-[9px] font-mono tracking-widest whitespace-nowrap break-keep">YOUTUBE LIBRARY</span>
                </div>
                
                <div className="playlist-carousel grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {importedSongs.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center text-white/30 text-xs font-light col-span-full">
                      No YouTube tracks imported yet. Paste a watch link in the <strong className="text-white/50">YouTube Importer</strong> above to get started!
                    </div>
                  ) : (
                    <>
                      {importedSongs.slice(0, 5).map((song) => (
                        <article 
                          key={song.id} 
                          onClick={() => {
                            if (Date.now() - lastLongPressTimeRef.current < 400) return;
                            handlePlaySong(song);
                          }}
                          onContextMenu={(e) => handleSongContextMenu(e, song)}
                          {...getSongTouchHandlers(song)}
                          className="music-card group bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-3 flex flex-col cursor-pointer transition-all duration-300 relative h-full"
                        >
                          <div className="aspect-square w-full rounded-xl overflow-hidden border border-white/5 shadow-md relative mb-3 artwork-container shrink-0">
                            <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="play w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
                                <Play className="w-4 h-4 ml-0.5 text-black fill-black" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-white font-display font-medium text-xs truncate leading-snug group-hover:text-pink-400 transition-colors" title={song.title}>{song.title}</h3>
                          <p className="text-white/40 text-[9px] line-clamp-2 mt-1 leading-normal font-light">{song.artist}</p>
                        </article>
                      ))}
                      
                      {importedSongs.length > 5 && (
                        <article 
                          onClick={() => setActiveTab("imported")}
                          className="music-card group bg-white/[0.02] hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/20 rounded-2xl p-3 flex flex-col cursor-pointer transition-all duration-300 relative h-full"
                        >
                          <div className="aspect-square w-full rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-center mb-3 shrink-0 relative overflow-hidden">
                            <Plus className="w-5 h-5 text-white/40 group-hover:text-pink-400 transition-all duration-300" />
                          </div>
                          <h3 className="text-white font-display font-medium text-xs truncate leading-snug group-hover:text-pink-400 transition-colors">See More</h3>
                          <p className="text-white/40 text-[9px] line-clamp-2 mt-1 leading-normal font-light">+{importedSongs.length - 5} tracks</p>
                        </article>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* RECENTLY PLAYED */}
              <section className="recent scroll-mt-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-display text-sm uppercase tracking-widest font-semibold text-white/80 whitespace-nowrap break-keep">Recently Played</h2>
                  <span className="text-white/20 text-[9px] font-mono tracking-widest whitespace-nowrap break-keep">HISTORY</span>
                </div>

                <div className="song-table flex flex-col gap-2.5">
                  {history.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-8 text-center text-white/30 text-xs font-light">
                      No listening footprint recorded yet. Start playing songs!
                    </div>
                  ) : (
                    history.slice(0, 5).map((song, idx) => (
                      <div 
                        key={`recent-${song.id}`}
                        onClick={() => {
                          if (Date.now() - lastLongPressTimeRef.current < 400) return;
                          handlePlaySong(song);
                        }}
                        onContextMenu={(e) => handleSongContextMenu(e, song)}
                        {...getSongTouchHandlers(song)}
                        className="song-row flex items-center justify-between p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-4 truncate">
                          <span className="text-white/20 text-[10px] font-mono w-4 shrink-0 text-center">{idx + 1}</span>
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 border border-white/5 artwork-container">
                            <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                          </div>
                          <div className="song-info truncate text-xs">
                            <p className="text-white font-medium truncate font-display tracking-tight text-xs">{song.title}</p>
                            <p className="text-white/40 truncate text-[10px] mt-0.5">{song.album}</p>
                          </div>
                        </div>
                        
                        <div className="artist text-white/40 font-mono text-[9px] uppercase tracking-widest truncate max-w-[120px] hidden md:block">
                          {song.artist}
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <div className="duration text-white/30 text-[10px] font-mono">{song.duration}</div>
                          
                          {/* Favorite button */}
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

                          <button
                            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all"
                          >
                            <Play className="w-2.5 h-2.5 fill-none" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

            </div>
          )}

          {activeTab === "library" && (
            <div id="library-view-container" className="flex flex-col gap-16 md:gap-24 animate-fade-in relative z-10">
              
              {/* UNIVERSAL PLAYLIST IMPORT PANEL */}
              <div 
                id="import-section-anchor" 
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="glass-panel glass-shine rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                  <Globe className="w-40 h-40 text-white animate-pulse" />
                </div>
                
                <div className="max-w-2xl relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/50 text-[8px] font-mono tracking-widest uppercase mb-4">
                    <Globe className="w-2.5 h-2.5" /> Multi-Source Adapter
                  </span>
                  <h3 className="text-white font-display font-light text-2xl md:text-3xl tracking-tight mb-4 select-none">Universal Playlist Import ⭐</h3>
                  <p className="text-white/40 text-xs md:text-sm leading-relaxed tracking-wide mb-8 font-light">
                    Paste playlist or album links directly from <strong className="text-white/60 font-normal">YouTube, YouTube Playlists, Spotify, Apple Music, or SoundCloud</strong>. Velvet's audio mapper catalogs title, artist, artwork, and length, securing your playlist indefinitely.
                  </p>

                  <form onSubmit={handleImportPlaylist} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      id="library-import-url-input"
                      type="text"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="Paste playlist URL (e.g., https://open.spotify.com/playlist/...)"
                      className="flex-1 h-[72px] md:h-12 px-5 text-sm md:text-xs text-white bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-xl outline-none focus:border-white/30 transition-all font-light placeholder:text-white/20"
                    />
                    <button 
                      id="library-import-submit-btn"
                      type="submit"
                      disabled={importLoading}
                      className="h-[72px] md:h-12 px-8 bg-white hover:bg-neutral-200 disabled:bg-white/20 disabled:text-white/40 text-black font-semibold text-[11px] uppercase tracking-widest rounded-2xl md:rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md"
                    >
                      {importLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {importLoading ? "Mapping Tracks..." : "Import"}
                    </button>
                  </form>

                  {importStatus && (
                    <div id="import-status-indicator" className="mt-4 text-[10px] font-mono text-white/50 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* MY CUSTOM COLLECTION */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/[0.04] pb-6 mb-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">{playlists.length} Portfolios</span>
                    <h3 className="text-white font-display text-lg md:text-xl tracking-tight font-light uppercase">My Playlists</h3>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      id="lib-create-playlist-btn"
                      onClick={() => setShowPlaylistForm(!showPlaylistForm)}
                      className="h-10 px-5 border border-white/10 hover:border-white/20 bg-white/[0.02] text-white/80 hover:text-white font-semibold text-[10px] rounded-xl flex items-center gap-2 transition-all cursor-pointer uppercase tracking-widest font-mono"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Playlist
                    </button>
                    <button 
                      id="lib-create-folder-btn"
                      onClick={() => setShowFolderForm(!showFolderForm)}
                      className="h-10 px-5 border border-white/10 hover:border-white/20 bg-white/[0.02] text-white/80 hover:text-white font-semibold text-[10px] rounded-xl flex items-center gap-2 transition-all cursor-pointer uppercase tracking-widest font-mono"
                    >
                      <FolderPlus className="w-3.5 h-3.5" /> Add Folder
                    </button>
                  </div>
                </div>

                {/* FOLDER FORM */}
                {showFolderForm && (
                  <form 
                    onSubmit={handleCreateFolder} 
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    className="glass-panel p-5 flex gap-3 max-w-md mb-10 animate-fade-in"
                  >
                    <input
                      id="folder-name-input"
                      type="text"
                      required
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder Name (e.g., Chill Beats)"
                      className="flex-1 h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25 transition-all"
                    />
                    <button type="submit" className="h-11 px-6 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-transform">Create</button>
                  </form>
                )}

                {/* PLAYLIST FORM */}
                {showPlaylistForm && (
                  <form 
                    onSubmit={handleCreatePlaylist} 
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    className="glass-panel p-6 flex flex-col gap-4 max-w-lg mb-10 animate-fade-in"
                  >
                    <h4 className="text-white font-mono text-[9px] uppercase tracking-widest text-white/50 mb-1">Assemble Playlist Container</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        id="playlist-name-input"
                        type="text"
                        required
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Playlist Name"
                        className="h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25"
                      />
                      <input
                        id="playlist-desc-input"
                        type="text"
                        value={newPlaylistDesc}
                        onChange={(e) => setNewPlaylistDesc(e.target.value)}
                        placeholder="Description"
                        className="h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <label className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-widest text-white/40 select-none cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newPlaylistIsPublic}
                          onChange={(e) => setNewPlaylistIsPublic(e.target.checked)}
                          className="accent-white rounded border-white/20 bg-neutral-950 w-3.5 h-3.5" 
                        />
                        <span>Public Access</span>
                      </label>
                      <button type="submit" className="h-10 px-6 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-transform">Save</button>
                    </div>
                  </form>
                )}

                {/* FOLDERS ROW */}
                {folders.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {folders.map(folder => (
                      <div 
                        key={folder.id} 
                        id={`folder-card-${folder.id}`} 
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        className="glass-panel glass-shine tilt-card p-5 rounded-2xl flex flex-col justify-between h-48 shadow-lg hover:border-white/20 transition-all cursor-pointer group"
                      >
                        <div>
                          <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.25em] block mb-1">STATION FOLDER</span>
                          <h4 className="text-white font-display font-medium text-sm tracking-tight leading-snug">{folder.name}</h4>
                          <p className="text-white/40 text-[9px] font-mono mt-1">{folder.playlistIds.length} playlist bindings</p>
                        </div>
                        
                        {folder.playlistIds.length > 0 ? (
                          <div className="flex flex-col gap-1.5 mt-4 pt-3 border-t border-white/5">
                            {playlists.filter(p => folder.playlistIds.includes(p.id)).map(p => (
                              <div key={p.id} className="text-[10px] text-white/60 flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5 font-light">
                                <span className="truncate">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 text-[9px] text-white/20 border border-dashed border-white/10 rounded-xl py-4 text-center font-light tracking-wide uppercase">
                            No binds mapped
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* LIST OF PLAYLIST CARDS - LUXURY PORTFOLIO CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-16">
                  {playlists.map((playlist) => (
                    <div 
                      key={playlist.id}
                      id={`playlist-card-${playlist.id}`}
                      onClick={() => {
                        setSelectedPlaylistId(playlist.id);
                        setActiveTab("playlist");
                      }}
                      onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                      className="glass-panel glass-shine tilt-card p-3 rounded-2xl cursor-pointer flex flex-col group relative select-none animate-fade-in"
                    >
                      <div className="aspect-square w-full rounded-xl overflow-hidden border border-white/5 shadow-md relative mb-4 artwork-container shrink-0">
                        <img 
                          src={playlist.artwork} 
                          alt="" 
                          className="w-full h-full object-cover artwork-lift" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPlaylist(playlist);
                            }}
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform"
                          >
                            <Play className="w-5 h-5 ml-1 text-black fill-black" />
                          </div>
                        </div>
                      </div>

                      <div className="px-1 flex-1 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <h4 className="text-white font-display font-medium text-xs tracking-tight truncate leading-snug">{playlist.name}</h4>
                            <p className="text-white/40 text-[9px] font-mono uppercase tracking-widest mt-1">{playlist.songs.length} Tracks</p>
                          </div>
                          {playlist.owner === "Drishti (You)" && (
                            <button 
                              id={`delete-playlist-btn-${playlist.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id, e);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-white/35 hover:text-white p-1 transition-opacity cursor-pointer animate-fade-in"
                              title="Delete Playlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MY TRACKS TABLE */}
              <div className="mt-4">
                <div className="flex flex-col gap-1 mb-8">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">Universal Registry</span>
                  <h4 className="text-white font-display text-lg tracking-tight font-light uppercase">Cross-Platform Tracks</h4>
                </div>
                <div className="glass-panel rounded-3xl p-4 flex flex-col gap-2.5">
                  {songsList.map((song) => (
                    <div 
                      key={song.id} 
                      id={`track-list-item-${song.id}`}
                      onClick={() => {
                        if (Date.now() - lastLongPressTimeRef.current < 400) return;
                        // Prevent playing if we are in the middle of renaming
                        if (renamingSongId !== song.id) {
                          handlePlaySong(song);
                        }
                      }}
                      onContextMenu={(e) => handleSongContextMenu(e, song)}
                      {...getSongTouchHandlers(song)}
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 truncate flex-1 mr-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-white/5 shrink-0 artwork-container">
                          <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div className="truncate text-xs flex-1">
                          {renamingSongId === song.id ? (
                            <div className="flex items-center gap-2 max-w-md" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleRenameYtSong(song.id, renameValue);
                                    setRenamingSongId(null);
                                  } else if (e.key === "Escape") {
                                    setRenamingSongId(null);
                                  }
                                }}
                                className="bg-white/10 text-white text-xs px-2 py-1 rounded border border-white/20 outline-none w-full"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  handleRenameYtSong(song.id, renameValue);
                                  setRenamingSongId(null);
                                }}
                                className="p-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 truncate">
                              <p className="text-white font-medium truncate font-display tracking-tight text-xs">{song.title}</p>
                              {song.source === "YouTube" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenamingSongId(song.id);
                                    setRenameValue(song.title);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white p-1 transition-all"
                                  title="Rename song"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-white/40 truncate font-mono text-[9px] uppercase tracking-widest mt-1">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {song.isUnavailable ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-mono tracking-widest uppercase">
                            <AlertCircle className="w-2.5 h-2.5" /> Unavailable
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/5 text-white/50 text-[8px] font-mono uppercase tracking-widest">{song.source}</span>
                        )}
                        <span className="text-white/30 text-[10px] font-mono font-light">{song.duration}</span>
                        
                        {/* Favorite button */}
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

                        {/* YouTube Custom Actions */}
                        {song.source === "YouTube" && (
                          <button
                            onClick={(e) => handleDeleteYtSong(song.id, e)}
                            className="p-1.5 rounded-full text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === "discover" && (
            <div id="discover-view-container" className="flex flex-col gap-16 md:gap-24 animate-fade-in relative z-10">
              
              {/* FILTER SEARCH BAR */}
              <div 
                className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row gap-4 items-center shadow-lg"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="relative flex-1 w-full flex items-center bg-white/[0.02] border border-white/[0.06] hover:border-white/10 rounded-xl p-1.5 transition-all">
                  <Search className="w-4 h-4 text-white/30 ml-4 shrink-0" />
                  <input 
                    id="discover-filter-input"
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter catalog songs, creators or electronic vibe artists..."
                    className="w-full bg-transparent text-white text-xs px-3.5 py-2.5 outline-none placeholder-white/30 font-light"
                  />
                  {searchQuery && (
                    <button 
                      id="discover-clear-search"
                      onClick={() => setSearchQuery("")}
                      className="text-[10px] uppercase font-mono tracking-wider text-white/45 hover:text-white px-4 transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* CATALOG SEARCH RESULTS */}
              <div>
                <div className="flex flex-col gap-1 mb-8">
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">Curation Index</span>
                  <h3 className="text-white font-display text-sm uppercase tracking-[0.2em] font-medium text-white/80">Catalog Tracks</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {filteredSongs.length === 0 ? (
                    <p className="text-white/30 text-xs py-10 col-span-3 text-center font-light">No vibrations found in active catalog indexing.</p>
                  ) : (
                    filteredSongs.map((song) => (
                      <div 
                        key={song.id}
                        id={`catalog-card-${song.id}`}
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        onContextMenu={(e) => handleSongContextMenu(e, song)}
                        {...getSongTouchHandlers(song)}
                        className="glass-panel glass-shine tilt-card rounded-2xl p-4 flex gap-4 items-center relative group transition-all hover:border-white/20 cursor-pointer"
                        onClick={() => {
                          if (Date.now() - lastLongPressTimeRef.current < 400) return;
                          handlePlaySong(song);
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-white/5 artwork-container">
                          <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div className="truncate flex-1">
                          <h4 className="text-white font-medium text-xs truncate font-display tracking-tight leading-none mb-1.5">{song.title}</h4>
                          <p className="text-white/40 text-[9px] truncate font-mono uppercase tracking-widest leading-none mb-2">{song.artist}</p>
                          <span className="inline-block px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40 text-[8px] font-mono uppercase tracking-wider">{song.source}</span>
                        </div>
                        
                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`catalog-play-btn-${song.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlaySong(song);
                              }}
                              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg"
                            >
                              <Play className="w-3.5 h-3.5 ml-0.5 fill-black text-black" />
                            </button>
                            <button
                              id={`catalog-fav-btn-${song.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(song.id);
                              }}
                              className={`w-8 h-8 rounded-full border flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg ${favorites.includes(song.id) ? "bg-pink-500/10 border-pink-500/20 text-pink-500" : "bg-white/[0.02] border-white/10 text-white/50 hover:text-white"}`}
                              title={favorites.includes(song.id) ? "Remove from Favorites" : "Save to Favorites"}
                            >
                              <Heart className="w-3.5 h-3.5" fill={favorites.includes(song.id) ? "currentColor" : "none"} />
                            </button>
                          </div>
                          <button
                            id={`catalog-queue-btn-${song.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddSongToQueue(song);
                            }}
                            className="text-[8px] font-mono text-white/30 hover:text-white uppercase tracking-widest p-1.5 bg-white/[0.04] rounded-lg hover:bg-white/10 text-center"
                          >
                            + Queue
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI RECOMMENDATIONS CONTROLS */}
              <div 
                className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                  <Sparkles className="w-40 h-40 text-white" />
                </div>

                <div className="max-w-2xl relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/50 text-[8px] font-mono tracking-widest uppercase mb-4">
                    <Sparkles className="w-2.5 h-2.5 text-white/60" /> Google Gemini AI
                  </span>
                  <h3 className="text-white font-display font-light text-2xl md:text-3xl tracking-tight mb-4 select-none">AI Curation Engine</h3>
                  <p className="text-white/40 text-xs md:text-sm leading-relaxed tracking-wide mb-8 font-light">
                    Select a mood and preferred genre constraint below to invoke Google Gemini AI to assemble a custom companion playlist on-demand.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-8">
                    <div>
                      <label className="text-[9px] font-mono tracking-widest text-white/40 block mb-2 uppercase">Mood Parameter</label>
                      <select 
                        id="recommendation-mood-select"
                        value={recommendationMood}
                        onChange={(e) => setRecommendationMood(e.target.value)}
                        className="w-full h-11 px-3 bg-neutral-900/60 border border-white/[0.08] rounded-xl text-xs text-white outline-none focus:border-white/20"
                      >
                        <option value="chill">Chill / Instrumental</option>
                        <option value="energetic">Energetic / Mid-tempo</option>
                        <option value="melancholic">Melancholic / Nostalgic</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono tracking-widest text-white/40 block mb-2 uppercase">Acoustic Genre</label>
                      <select 
                        id="recommendation-genre-select"
                        value={recommendationGenre}
                        onChange={(e) => setRecommendationGenre(e.target.value)}
                        className="w-full h-11 px-3 bg-neutral-900/60 border border-white/[0.08] rounded-xl text-xs text-white outline-none focus:border-white/20"
                      >
                        <option value="synthwave">Synthwave / Retro</option>
                        <option value="lofi">Lofi HipHop</option>
                        <option value="ambient">Space Ambient</option>
                        <option value="cyberpunk">Cyberpunk / Industrial</option>
                      </select>
                    </div>

                    <button 
                      id="generate-recommendations-btn"
                      onClick={handleFetchRecommendations}
                      disabled={recommendationLoading}
                      className="w-full h-11 bg-white hover:bg-neutral-200 disabled:bg-white/20 disabled:text-white/40 text-black font-semibold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      {recommendationLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {recommendationLoading ? "Curating..." : "Assemble List"}
                    </button>
                  </div>

                  {/* RECS TABLE */}
                  {aiRecommendations.length > 0 && (
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-x-auto shadow-inner">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead>
                          <tr className="text-white/30 font-mono text-[9px] uppercase tracking-widest border-b border-white/5 pb-3">
                            <th className="pb-3 pl-2">Track</th>
                            <th className="pb-3">Album</th>
                            <th className="pb-3">Platform</th>
                            <th className="pb-3 text-right">Curator Note</th>
                            <th className="pb-3 text-right pr-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {aiRecommendations.map((rec, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 pl-2">
                                <span className="text-white font-medium block font-display tracking-tight">{rec.title}</span>
                                <span className="text-white/40 text-[9px] mt-0.5 block font-mono uppercase tracking-wider">{rec.artist}</span>
                              </td>
                              <td className="py-4 text-white/50 text-[11px]">{rec.album || "Studio Master"}</td>
                              <td className="py-4">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-white/[0.04] text-white/50 text-[8px] font-mono uppercase tracking-wider">{rec.source || "Spotify"}</span>
                              </td>
                              <td className="py-4 text-white/40 text-[10px] max-w-xs leading-relaxed text-right font-light">{rec.note}</td>
                              <td className="py-4 text-right pr-2">
                                <button
                                  id={`rec-play-btn-${i}`}
                                  onClick={() => handlePlaySong({
                                    id: `rec-${Date.now()}-${i}`,
                                    title: rec.title,
                                    artist: rec.artist,
                                    album: rec.album || "Velvet Mix",
                                    duration: rec.duration || "3:30",
                                    artwork: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
                                    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
                                    source: rec.source || "Spotify",
                                    lyrics: "Custom synthesized music recommendation curated by Gemini AI."
                                  })}
                                  className="h-7 px-3 bg-white text-black hover:bg-neutral-200 text-[9px] font-semibold uppercase tracking-widest rounded-lg cursor-pointer transition-colors"
                                >
                                  Play
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* FAVORITES VIEW TAB */}
          {activeTab === "favorites" && (
            <div id="favorites-view-container" className="flex flex-col gap-10 animate-fade-in relative z-10">
              <section className="hero relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <Heart className="w-48 h-48 text-white animate-pulse" />
                </div>
                <span className="text-pink-400/80 text-[10px] font-mono uppercase tracking-[0.25em] block mb-2">My Curated Frequencies</span>
                <h1 className="text-white font-display text-4xl sm:text-5xl font-light tracking-tight select-none leading-none mb-3">Favorites</h1>
                <p className="text-white/60 text-xs sm:text-sm font-light uppercase tracking-[0.2em] mb-6">Your Liked Tracks</p>
                <div className="text-white/40 text-[11px] font-mono flex items-center gap-2">
                  <span>{allKnownSongs.filter(song => favorites.includes(song.id)).length} Tracks Saved</span>
                </div>
              </section>

              <div className="glass-panel rounded-3xl p-4 flex flex-col gap-2.5">
                {allKnownSongs.filter(song => favorites.includes(song.id)).length === 0 ? (
                  <div className="py-16 text-center text-white/30 flex flex-col items-center justify-center gap-3">
                    <Heart className="w-8 h-8 opacity-30 text-white" />
                    <p className="text-xs font-mono uppercase tracking-widest">No Favorites Yet</p>
                    <p className="text-[10px] text-white/20 max-w-xs leading-relaxed font-light">Click the heart button on any track across Velvet to lock it into your custom discovery frequencies.</p>
                  </div>
                ) : (
                  allKnownSongs.filter(song => favorites.includes(song.id)).map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                      <div 
                        key={song.id} 
                        id={`favorite-list-item-${song.id}`}
                        onClick={() => {
                          if (Date.now() - lastLongPressTimeRef.current < 400) return;
                          handlePlaySong(song);
                        }}
                        onContextMenu={(e) => handleSongContextMenu(e, song)}
                        {...getSongTouchHandlers(song)}
                        className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-4 truncate">
                          <span className="text-white/20 text-[10px] font-mono w-4 shrink-0 text-center">{index + 1}</span>
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-white/5 shrink-0 artwork-container">
                            <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                          </div>
                          <div className="truncate text-xs">
                            <p className={`font-medium truncate font-display tracking-tight text-xs ${isCurrent ? 'text-pink-400' : 'text-white'}`}>{song.title}</p>
                            <p className="text-white/40 truncate font-mono text-[9px] uppercase tracking-widest mt-1">{song.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/5 text-white/50 text-[8px] font-mono uppercase tracking-widest">{song.source}</span>
                          <span className="text-white/30 text-[10px] font-mono font-light">{song.duration}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(song.id);
                            }}
                            className="text-pink-500 hover:text-white transition-colors"
                            title="Remove from Favorites"
                          >
                            <Heart className="w-4 h-4 fill-pink-500 text-pink-500 hover:text-white" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* IMPORTED TRACKS VIEW TAB */}
          {activeTab === "imported" && (
            <div id="imported-view-container" className="flex flex-col gap-10 animate-fade-in relative z-10">
              <section className="hero relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                  <Upload className="w-48 h-48 text-white animate-pulse" />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-pink-400/80 text-[10px] font-mono uppercase tracking-[0.25em] block">My YouTube Library</span>
                  <button 
                    onClick={() => setActiveTab("home")}
                    className="text-[9px] text-white/50 hover:text-white font-mono uppercase tracking-wider bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded-md transition-all ml-4 cursor-pointer"
                  >
                    ← Back Home
                  </button>
                </div>
                <h1 className="text-white font-display text-4xl sm:text-5xl font-light tracking-tight select-none leading-none mb-3">Imported Tracks</h1>
                <p className="text-white/60 text-xs sm:text-sm font-light uppercase tracking-[0.2em] mb-6">All YouTube Direct Links</p>
                <div className="text-white/40 text-[11px] font-mono flex items-center gap-2">
                  <span>{importedSongs.length} Tracks Total</span>
                </div>
              </section>

              <div className="glass-panel rounded-3xl p-4 flex flex-col gap-2.5">
                {importedSongs.length === 0 ? (
                  <div className="py-16 text-center text-white/30 flex flex-col items-center justify-center gap-3">
                    <Upload className="w-8 h-8 opacity-30 text-white" />
                    <p className="text-xs font-mono uppercase tracking-widest">No YouTube Imports</p>
                    <p className="text-[10px] text-white/20 max-w-xs leading-relaxed font-light">
                      Go to the home page and use the YouTube Importer to add some direct watch links to your library!
                    </p>
                  </div>
                ) : (
                  importedSongs.map((song, index) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                      <div 
                        key={song.id} 
                        id={`imported-list-item-${song.id}`}
                        onClick={() => {
                          if (Date.now() - lastLongPressTimeRef.current < 400) return;
                          handlePlaySong(song);
                        }}
                        onContextMenu={(e) => handleSongContextMenu(e, song)}
                        {...getSongTouchHandlers(song)}
                        className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-4 truncate">
                          <span className="text-white/20 text-[10px] font-mono w-4 shrink-0 text-center">{index + 1}</span>
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-white/5 shrink-0 artwork-container">
                            <img src={song.artwork} className="w-full h-full object-cover artwork-lift" alt="" referrerPolicy="no-referrer" />
                          </div>
                          <div className="truncate text-xs">
                            <p className={`font-medium truncate font-display tracking-tight text-xs ${isCurrent ? 'text-pink-400' : 'text-white'}`}>{song.title}</p>
                            <p className="text-white/40 truncate font-mono text-[9px] uppercase tracking-widest mt-1">{song.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/5 text-white/50 text-[8px] font-mono uppercase tracking-widest">{song.source}</span>
                          <span className="text-white/30 text-[10px] font-mono font-light">{song.duration}</span>
                          
                          {/* Favorite button */}
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
          )}

          {/* PROFILE VIEW TAB */}
          {activeTab === "profile" && (
            <div id="profile-view-container" className="flex flex-col gap-8 animate-fade-in relative z-10 w-full max-w-5xl mx-auto">
              
              {/* PROFILE HEADER CARD */}
              <div 
                id="profile-header-card"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="glass-panel glass-shine tilt-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl relative"
              >
                {/* Background ambient lighting - wrapped in an overflow-clipped container to prevent spilling */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px]"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px]"></div>
                </div>

                {/* Avatar with hover controls */}
                <div className="relative group shrink-0 select-none z-10">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl relative flex items-center justify-center bg-neutral-900">
                    <img 
                      id="profile-avatar-img"
                      src={userAvatar} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="User Avatar" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                         onClick={() => setShowUploadModal(true)}
                    >
                      <Camera className="w-5 h-5 text-white/80" />
                      <span className="text-[9px] font-mono text-white/80 uppercase tracking-widest">Change Pic</span>
                    </div>
                  </div>
                </div>

                {/* Profile Details (In-Place Editable) */}
                <div className="flex-1 text-center md:text-left w-full">
                  {!isEditingProfile ? (
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start mb-2.5">
                          <h2 id="profile-display-name" className="text-white font-display text-2xl md:text-3xl font-semibold tracking-tight">
                            {isLoggedIn ? (userName || "Guest Listener") : (userName || "Guest Listener")}
                          </h2>
                          <span className="self-center px-2.5 py-0.5 text-[8px] font-mono tracking-widest uppercase rounded bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/25 text-pink-300">
                            Verified Sound Owner
                          </span>
                        </div>
                        <p id="profile-desc" className="text-white/60 text-xs md:text-sm font-light leading-relaxed max-w-xl mb-4 font-sans">
                          {userDesc}
                        </p>
                        <p id="profile-email-badge" className="text-white/25 text-[10px] font-mono uppercase tracking-widest">
                          {isLoggedIn ? userEmail : "Guest Listener Session"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5 justify-center md:justify-start mt-6 pt-6 border-t border-white/5">
                        <button
                          id="edit-profile-btn"
                          onClick={() => {
                            setEditName(userName);
                            setEditDesc(userDesc);
                            setIsEditingProfile(true);
                          }}
                          className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-[10px] font-mono uppercase tracking-widest border border-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Profile Info</span>
                        </button>
                        
                        {isLoggedIn ? (
                          <button
                            id="profile-logout-btn"
                            onClick={handleLogout}
                            className="h-9 px-4 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 text-[10px] font-mono uppercase tracking-widest border border-pink-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Sign Out Session</span>
                          </button>
                        ) : (
                          <button
                            id="profile-login-btn"
                            onClick={() => setShowLoginOverlay(true)}
                            className="h-9 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-md"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Sign In / Register</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form 
                      id="profile-editor-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setUserName(editName.trim() || userName);
                        setUserDesc(editDesc.trim() || userDesc);
                        setIsEditingProfile(false);
                      }}
                      className="flex flex-col gap-4 text-left"
                    >
                      <span className="text-[9px] font-mono tracking-widest text-pink-400 uppercase mb-1">Editing Profile Info</span>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-mono uppercase tracking-wider text-white/40">Username</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g., Drishti"
                          className="h-10 px-3.5 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-pink-500/50 w-full font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-mono uppercase tracking-wider text-white/40">Profile Description</label>
                        <textarea
                          rows={3}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Tell people about your acoustic taste..."
                          className="p-3.5 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-pink-500/50 w-full font-sans resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-3.5 mt-2 font-mono text-[9px] uppercase tracking-widest font-semibold">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer shadow-md"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* LISTENING STATISTICS DASHBOARD ROW */}
              <div id="stats-dashboard-row" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* STAT TILE 1: TOTAL LISTENING HOURS */}
                <div 
                  id="stat-tile-hours"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-32"
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1">TODAY'S LISTENING HOURS</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <h3 className="text-white font-display text-2xl font-semibold leading-none font-mono">
                        {(() => {
                          const systemDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                          const todayDayName = systemDays[new Date().getDay()];
                          const todayListeningHours = weeklyListening[todayDayName] || 0;
                          return todayListeningHours.toFixed(5);
                        })()}
                      </h3>
                      <span className="text-white/40 text-[10px] font-mono uppercase tracking-wider">hrs</span>
                      {isPlaying && currentSong && (
                        <span className="flex h-2.5 w-2.5 relative ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/5 pt-2.5 mt-2">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">+18.4% since last week</span>
                    <Clock className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* STAT TILE 2: SONGS IMPORTED */}
                <div 
                  id="stat-tile-imported"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-32"
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1">SONGS IMPORTED</span>
                    <h3 className="text-white font-display text-2xl font-semibold leading-none">
                      {songsList.filter(s => s.source === "YouTube" || s.videoId || s.importedAt).length} tracks
                    </h3>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/5 pt-2.5 mt-2">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-pink-400 font-semibold">Real-time YouTube link count</span>
                    <Upload className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* STAT TILE 3: PLAYLISTS CREATED */}
                <div 
                  id="stat-tile-playlists"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-32"
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1">PLAYLIST CURATIONS</span>
                    <h3 className="text-white font-display text-2xl font-semibold leading-none">
                      {playlists.filter(p => p.owner === "Drishti (You)" || p.id.startsWith("custom-playlist-")).length} curations
                    </h3>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/5 pt-2.5 mt-2">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-orange-400 font-semibold">Active portfolios</span>
                    <Library className="w-3.5 h-3.5 text-white/20" />
                  </div>
                </div>

                {/* STAT TILE 4: FAVORITES TRACKED */}
                <div 
                  id="stat-tile-favorites"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-32"
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1">FAVORITES SAVED</span>
                    <h3 className="text-white font-display text-2xl font-semibold leading-none">
                      {favorites.length} songs
                    </h3>
                  </div>
                  <div className="flex items-end justify-between border-t border-white/5 pt-2.5 mt-2">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-purple-400 font-semibold">Acoustic benchmarks</span>
                    <Heart className="w-3.5 h-3.5 text-white/20 animate-pulse" />
                  </div>
                </div>

              </div>

              {/* STATS VISUAL PAGE: WEEKLY LISTENING CHART & GENRE DISTRIBUTION */}
              <div id="stats-visuals-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* WEEKLY TREND CHART TILE (7 cols) */}
                <div 
                  id="weekly-listening-chart-tile"
                  className="glass-panel rounded-3xl p-6 lg:col-span-7 flex flex-col justify-between"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1.5">Weekly Listening Trends</span>
                    <h3 className="text-white font-display text-sm font-semibold tracking-wide mb-6">Acoustic Activity Log (Mon - Sun)</h3>
                  </div>

                  {/* CUSTOM SVG BAR GRAPH */}
                  <div className="w-full h-44 flex items-end justify-between gap-3 md:gap-5 px-2 relative border-b border-white/[0.05] pb-1">
                    {(() => {
                      const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      const maxHrsInWeek = Math.max(...(Object.values(weeklyListening) as number[]), 1.0);
                      const maxHrs = Math.max(maxHrsInWeek, 6.0); // Maintain a minimum scale for aesthetics
                      
                      const systemDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                      const activeDayName = systemDays[new Date().getDay()];

                      return daysOrder.map((day, idx) => {
                        const hrs = weeklyListening[day] || 0;
                        const percentageHeight = (hrs / maxHrs) * 100;
                        const isToday = activeDayName === day;
                        const color = isToday ? "#ec4899" : (idx % 2 === 0 ? "#ec4899" : "#f97316");

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group/bar relative">
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-neutral-950 border border-white/10 rounded-md px-2 py-1 text-[8px] font-mono text-white/90 shadow-xl whitespace-nowrap z-20">
                              {hrs >= 0.0166 ? `${hrs.toFixed(2)} hours` : `${(hrs * 3600).toFixed(0)} seconds`} {isToday && " (Today)"}
                            </div>
                            
                            {/* Bar block */}
                            <div className="w-full rounded-t-lg relative transition-all duration-500 overflow-hidden" 
                                 style={{ 
                                   height: `${percentageHeight}%`,
                                   background: `linear-gradient(to top, ${color}20, ${color})`,
                                   boxShadow: `0 0 15px ${color}30`
                                 }}
                            >
                              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                            </div>

                            <span className={`text-[9px] font-mono transition-colors ${isToday ? 'text-pink-400 font-bold' : 'text-white/40 group-hover/bar:text-white'}`}>{day}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* RADIAL GENRE DISTRIBUTION TILE (5 cols) */}
                <div 
                  id="radial-genre-chart-tile"
                  className="glass-panel rounded-3xl p-6 lg:col-span-5 flex flex-col justify-between"
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1.5">Genre Proportions</span>
                    <h3 className="text-white font-display text-sm font-semibold tracking-wide mb-6">Aesthetic Style Weighting</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                    {/* SVG Radial Progress Circle */}
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* Synthwave circle */}
                        <circle cx="64" cy="64" r="54" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="none" />
                        <circle cx="64" cy="64" r="54" stroke="#ec4899" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 54}`} strokeDashoffset={`${2 * Math.PI * 54 * (1 - 0.45)}`} fill="none" strokeLinecap="round" />
                        
                        {/* Lofi circle */}
                        <circle cx="64" cy="64" r="42" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="none" />
                        <circle cx="64" cy="64" r="42" stroke="#f97316" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.28)}`} fill="none" strokeLinecap="round" />
                        
                        {/* Space Ambient circle */}
                        <circle cx="64" cy="64" r="30" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="none" />
                        <circle cx="64" cy="64" r="30" stroke="#a855f7" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 30}`} strokeDashoffset={`${2 * Math.PI * 30 * (1 - 0.17)}`} fill="none" strokeLinecap="round" />
                      </svg>
                      
                      <div className="absolute flex flex-col items-center justify-center">
                        <Headphones className="w-5 h-5 text-white/40 animate-pulse" />
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col gap-2.5 w-full">
                      {[
                        { genre: "Synthwave", pct: "45%", color: "bg-pink-500" },
                        { genre: "Lofi HipHop", pct: "28%", color: "bg-orange-500" },
                        { genre: "Ambient Space", pct: "17%", color: "bg-purple-500" },
                        { genre: "Other Styles", pct: "10%", color: "bg-white/10" }
                      ].map((lg, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${lg.color}`}></div>
                            <span className="text-white/60 font-medium font-sans">{lg.genre}</span>
                          </div>
                          <span className="text-white font-mono text-[10px] font-semibold">{lg.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* MOST 10 PLAYED SONG (IN A BIG TILE) */}
              <div 
                id="top-played-songs-tile"
                className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col justify-between"
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <div className="border-b border-white/5 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-pink-400 block mb-1">AESTHETIC ROTATION</span>
                    <h3 className="text-white font-display text-lg font-semibold tracking-tight">Most 10 Played Tracks</h3>
                  </div>
                  <span className="px-2.5 py-1 text-[8px] font-mono uppercase tracking-wider text-white/30 rounded bg-white/[0.02]">
                    Recalibrated Live
                  </span>
                </div>

                {/* Rank lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const sortedTracks = [...songsList]
                      .map(s => ({
                        ...s,
                        playCount: playCounts[s.id] || 0
                      }))
                      .sort((a, b) => b.playCount - a.playCount)
                      .slice(0, 10);

                    const maxPlayCount = sortedTracks[0]?.playCount || 1;

                    return sortedTracks.map((song, index) => {
                      const isCurrent = currentSong?.id === song.id;
                      const playPercent = (song.playCount / maxPlayCount) * 100;
                      return (
                        <div 
                          key={song.id}
                          id={`top-played-track-${song.id}`}
                          onClick={() => handlePlaySong(song)}
                          className={`flex items-center gap-4 p-2.5 rounded-xl border transition-all cursor-pointer group/row ${isCurrent ? "bg-white/10 border-white/10" : "bg-white/[0.01] border-white/[0.04] hover:bg-white/5 hover:border-white/10"}`}
                        >
                          {/* Rank */}
                          <span className="text-sm font-mono text-white/20 group-hover/row:text-pink-400/80 transition-colors shrink-0 font-bold w-6 text-center">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          {/* Cover */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 border border-white/5">
                            <img src={song.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex justify-between items-baseline gap-2">
                              <h4 className={`text-xs font-medium font-display truncate leading-none ${isCurrent ? "text-pink-400" : "text-white"}`}>
                                {song.title}
                              </h4>
                              <span className="text-[9px] font-mono text-white/30 group-hover/row:text-white/50 transition-colors">
                                {song.playCount} plays
                              </span>
                            </div>
                            
                            <p className="text-[9px] text-white/40 font-mono uppercase tracking-wider truncate leading-none mb-1">
                              {song.artist}
                            </p>

                            {/* Progress bar representing play weight */}
                            <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-1000"
                                style={{ width: `${playPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* PLAYLISTS CREATED IN VERY SMALL TILES */}
              <div 
                id="profile-created-playlists-tile"
                className="flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 block mb-1">CURATED CONTAINERS</span>
                    <h3 className="text-white font-display text-sm font-semibold tracking-wide">Playlists Created</h3>
                  </div>
                  <span className="text-[9px] font-mono text-white/30 uppercase">
                    {playlists.filter(p => p.owner === "Drishti (You)" || p.id.startsWith("custom-playlist-")).length} Created
                  </span>
                </div>

                {/* Ultra small playlist tiles */}
                {playlists.filter(p => p.owner === "Drishti (You)" || p.id.startsWith("custom-playlist-")).length === 0 ? (
                  <div className="glass-panel p-8 text-center text-white/20 font-mono text-[10px] uppercase tracking-widest rounded-2xl">
                    No custom playlists created yet
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {playlists
                      .filter(p => p.owner === "Drishti (You)" || p.id.startsWith("custom-playlist-"))
                      .map((p) => (
                        <div 
                          key={p.id}
                          id={`small-playlist-tile-${p.id}`}
                          onClick={() => {
                            setSelectedPlaylistId(p.id);
                            setActiveTab("playlist");
                          }}
                          className="glass-panel group p-2.5 rounded-xl cursor-pointer flex flex-col items-center text-center gap-2 hover:border-white/20 transition-all hover:-translate-y-1 select-none animate-fade-in relative"
                        >
                          <div className="aspect-square w-full rounded-lg overflow-hidden border border-white/5 relative shrink-0">
                            <img src={p.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-6 h-6 text-white fill-white transform scale-75 group-hover:scale-100 transition-all" />
                            </div>
                          </div>
                          <div className="w-full">
                            <p className="text-[10px] font-semibold text-white truncate leading-tight w-full group-hover:text-pink-400 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[8px] text-white/30 font-mono truncate uppercase tracking-wider mt-0.5">
                              {p.songs.length} tracks
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* IMAGE CROPPER MODAL */}
              {showCropper && (
                <div 
                  id="avatar-cropper-modal" 
                  className="fixed inset-0 z-50 flex items-start justify-center md:justify-start md:pl-24 pt-20 animate-fade-in bg-black/20"
                >
                  <div className="bg-neutral-950 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-80 md:w-[22rem] flex flex-col items-center gap-5 animate-scale-up relative z-10 shadow-black/40 text-left">
                    <div className="w-full flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-white font-display text-sm font-semibold tracking-tight">Crop Profile Picture</h3>
                      <button 
                        onClick={() => {
                          setShowCropper(false);
                          setCropperSrc("");
                        }}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* VIEWPORT CONTAINER */}
                    <div 
                      className="w-64 h-64 rounded-full overflow-hidden border border-white/20 relative cursor-grab active:cursor-grabbing bg-neutral-900 shadow-inner flex items-center justify-center"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* Circular mask border to show crop edge */}
                      <div className="absolute inset-0 rounded-full border border-pink-500 pointer-events-none z-10 shadow-[0_0_30px_rgba(0,0,0,0.85)_inset]"></div>
                      
                      <img 
                        src={cropperSrc} 
                        className="pointer-events-none select-none max-w-none max-h-none"
                        style={{
                          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                          transformOrigin: 'center center',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                        alt="To Crop"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* CONTROLS */}
                    <div className="w-full flex flex-col gap-4">
                      {/* Zoom Level text */}
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase text-white/40">
                        <span>Drag to move • Slider to Zoom</span>
                        <span className="text-pink-400">{(zoom * 100).toFixed(0)}%</span>
                      </div>

                      {/* Slider with Zoom Buttons */}
                      <div className="flex items-center gap-3 w-full">
                        <button 
                          onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-all text-sm font-bold active:scale-90"
                        >
                          -
                        </button>
                        <input 
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="flex-1 accent-pink-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                        />
                        <button 
                          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-all text-sm font-bold active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 w-full font-mono text-[9px] uppercase tracking-widest font-semibold mt-2">
                      <button
                        onClick={cropImage}
                        className="flex-1 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl transition-all shadow-lg text-center cursor-pointer active:scale-95"
                      >
                        Apply Crop
                      </button>
                      <button
                        onClick={() => {
                          setShowCropper(false);
                          setCropperSrc("");
                        }}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-xl transition-all border border-white/10 text-center cursor-pointer font-mono text-[9px] uppercase tracking-widest font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* UPLOAD PROFILE PICTURE MODAL */}
              {showUploadModal && (
                <div 
                  id="avatar-upload-modal" 
                  className="fixed inset-0 z-50 flex items-start justify-center md:justify-start md:pl-24 pt-20 animate-fade-in bg-black/20"
                >
                  <div className="bg-neutral-950 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-80 md:w-[22rem] flex flex-col gap-5 animate-scale-up relative z-10 shadow-black/40 text-left">
                    <div className="w-full flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-white font-display text-sm font-semibold tracking-tight">Upload Profile Picture</h3>
                      <button 
                        onClick={() => setShowUploadModal(false)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DRAG AND DROP ZONE */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("avatar-file-input")?.click()}
                      className={`w-full py-10 px-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3.5 ${
                        isDragOver 
                          ? "border-pink-500 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]" 
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-white">
                          Drag & drop your picture here
                        </p>
                        <p className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
                          or click to browse your device
                        </p>
                      </div>
                      
                      <input 
                        id="avatar-file-input"
                        type="file" 
                        accept="image/jpeg, image/png, image/webp, image/jpg" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            processSelectedFile(file);
                          }
                        }}
                      />
                    </div>

                    {/* SPECS/FORMAT INFO */}
                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase text-white/30 bg-white/[0.01] p-2.5 rounded-xl border border-white/5 justify-center">
                      <span>Supported: JPG, PNG, WebP</span>
                    </div>

                    {/* CANCEL BUTTON */}
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-xl transition-all border border-white/10 text-center cursor-pointer font-mono text-[9px] uppercase tracking-widest font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PERSONALIZE VIEW TAB FOR MOBILE */}
          {activeTab === "personalize" && (
            <div id="personalize-view-container" className="flex flex-col gap-6 md:gap-8 animate-fade-in relative z-10 w-full max-w-xl mx-auto pb-6">
              <section className="hero relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                  <Sparkles className="w-36 h-36 text-white animate-pulse" />
                </div>
                <span className="text-pink-400/80 text-[10px] font-mono uppercase tracking-[0.25em] block mb-2">Aesthetic & Space Design</span>
                <h1 className="text-white font-display text-2xl font-light tracking-tight select-none leading-none mb-1">Personalize</h1>
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Customize your digital audio canvas</p>
              </section>

              {/* PRESETS CONTAINER */}
              <div className="glass-panel rounded-3xl p-5 border border-white/5 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.02] flex flex-col gap-4">
                <h3 className="text-white text-xs font-semibold uppercase tracking-wider font-mono text-white/40 mb-1">Preset Themes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_PRESETS.map((p) => {
                    const isSelected = themeAccent === p.accent && themeBlob1 === p.blob1;
                    return (
                      <button
                        key={`mobile-theme-${p.id}`}
                        onClick={() => {
                          setThemeAccent(p.accent);
                          setThemeBlob1(p.blob1);
                          setThemeBlob2(p.blob2);
                          setThemeName(p.name);
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-white/[0.06] border-pink-500 text-white" 
                            : "bg-white/[0.01] border-white/5 text-white/60 hover:border-white/10"
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold font-display">{p.name}</span>
                          <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5">{p.accent}</span>
                        </div>
                        <div className="flex gap-1 items-center shrink-0">
                          <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: p.accent }}></span>
                          <span className="w-2.5 h-2.5 rounded-full opacity-60" style={{ backgroundColor: `rgb(${p.blob1})` }}></span>
                          <span className="w-2.5 h-2.5 rounded-full opacity-60" style={{ backgroundColor: `rgb(${p.blob2})` }}></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM COLOR ADJUSTERS */}
              <div className="glass-panel rounded-3xl p-5 border border-white/5 bg-gradient-to-br from-white/[0.01] via-transparent to-white/[0.02] flex flex-col gap-5">
                <h3 className="text-white text-xs font-semibold uppercase tracking-wider font-mono text-white/40 mb-1">Custom Canvas Pigments</h3>
                
                {/* ACCENT COLOR */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white/90">Accent Theme Color</span>
                    <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5">{themeAccent}</span>
                  </div>
                  <label className="relative cursor-pointer shrink-0">
                    <input 
                      type="color" 
                      value={themeAccent}
                      onChange={(e) => {
                        const hex = e.target.value;
                        setThemeAccent(hex);
                        setThemeName("Custom");
                      }}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 rounded-xl border border-white/20 shadow-inner" style={{ backgroundColor: themeAccent }} />
                  </label>
                </div>

                {/* LEFT BLOB COLOR */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white/90">Left Ambient Glow Blob</span>
                    <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5">rgb({themeBlob1})</span>
                  </div>
                  <label className="relative cursor-pointer shrink-0">
                    <input 
                      type="color" 
                      value={`#${themeBlob1.split(",").map(v => {
                        const num = parseInt(v.trim());
                        return isNaN(num) ? "00" : num.toString(16).padStart(2, "0");
                      }).join("")}`}
                      onChange={(e) => {
                        const hex = e.target.value;
                        const rgb = hexToRgbStr(hex);
                        setThemeBlob1(rgb);
                        setThemeName("Custom");
                      }}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 rounded-xl border border-white/20 shadow-inner" style={{ backgroundColor: `rgb(${themeBlob1})` }} />
                  </label>
                </div>

                {/* RIGHT BLOB COLOR */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-white/90">Right Ambient Glow Blob</span>
                    <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5">rgb({themeBlob2})</span>
                  </div>
                  <label className="relative cursor-pointer shrink-0">
                    <input 
                      type="color" 
                      value={`#${themeBlob2.split(",").map(v => {
                        const num = parseInt(v.trim());
                        return isNaN(num) ? "00" : num.toString(16).padStart(2, "0");
                      }).join("")}`}
                      onChange={(e) => {
                        const hex = e.target.value;
                        const rgb = hexToRgbStr(hex);
                        setThemeBlob2(rgb);
                        setThemeName("Custom");
                      }}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 rounded-xl border border-white/20 shadow-inner" style={{ backgroundColor: `rgb(${themeBlob2})` }} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* PLAYLIST DETAIL VIEW TAB */}
          {activeTab === "playlist" && selectedPlaylistId && (() => {
            const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);
            return currentPlaylist ? (
              <PlaylistDetail 
                playlist={currentPlaylist}
                currentSong={currentSong}
                isPlaying={isPlaying}
                favorites={favorites}
                onPlaySong={handlePlaySong}
                onPlayPlaylist={handlePlayPlaylist}
                onShufflePlaylist={handleShufflePlaylist}
                onSongContextMenu={(e, song) => handleSongContextMenu(e, song, selectedPlaylistId)}
                toggleFavorite={toggleFavorite}
                onBack={() => setActiveTab("library")}
                onUpdateArtwork={handleUpdatePlaylistArtwork}
                onUpdateNameAndDesc={handleUpdatePlaylistNameAndDesc}
                getSongTouchHandlers={(song) => getSongTouchHandlers(song, selectedPlaylistId)}
                lastLongPressTimeRef={lastLongPressTimeRef}
              />
            ) : (
              <div className="text-center text-white/30 py-20 font-mono text-xs uppercase tracking-widest">
                Playlist Portfolio Not Found
              </div>
            );
          })()}

          {/* MINIMAL FOOTER */}
          <footer className="pt-16 pb-6 border-t border-white/[0.04] text-center flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-white/30 text-[9px] font-mono uppercase tracking-[0.25em]">VELVET DISCOVERY PLATFORM</span>
            <span className="text-white/20 text-[9px] font-mono tracking-widest">© {new Date().getFullYear()} VELVET. MADE FOR SOUND OWNERS.</span>
          </footer>

        </main>

        {/* RIGHT PANEL */}
        <aside className="right-sidebar w-80 bg-black/45 backdrop-blur-3xl border-l border-white/5 flex flex-col p-6 overflow-y-auto shrink-0 z-10 hidden lg:flex">
          
          <div className="panel-header flex items-center justify-between mb-6 border-b border-white/5 pb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50">All Songs</h3>
            <span className="text-[10px] text-white/30 font-mono uppercase">{songsList.length} Tracks</span>
          </div>

          <div className="song-list flex flex-col gap-2.5 overflow-y-auto">
            {songsList.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <div 
                  key={`right-${song.id}`}
                  onClick={() => handlePlaySong(song)}
                  className={`song-item flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${isCurrent ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <img src={song.artwork} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/5" alt="" referrerPolicy="no-referrer" />
                    <div className="song-details truncate">
                      <p className={`text-xs font-medium truncate font-display ${isCurrent ? 'text-pink-400' : 'text-white'}`}>{song.title}</p>
                      <p className="text-[9px] text-white/40 truncate font-mono mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="time text-[9px] text-white/30 font-mono">{song.duration}</span>
                    <button className="p-1 rounded-full text-white/40 hover:text-white transition-colors">
                      {isCurrent && isPlaying ? <Pause className="w-3 h-3 text-pink-400 fill-pink-400" /> : <Play className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </aside>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="mobile-navbar fixed bottom-0 left-0 right-0 h-16 bg-neutral-950/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around px-4 z-[9999] md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.9)]">
          <button 
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all relative ${activeTab === "home" ? "text-pink-400" : "text-white/40 hover:text-white"}`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px] font-medium tracking-wider font-display uppercase leading-none">Home</span>
            {activeTab === "home" && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-500"></span>}
          </button>
          
          <button 
            onClick={() => { setActiveTab("library"); setShowPlaylistForm(false); }}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all relative ${activeTab === "library" ? "text-pink-400" : "text-white/40 hover:text-white"}`}
          >
            <Library className="w-5 h-5" />
            <span className="text-[9px] font-medium tracking-wider font-display uppercase leading-none">Playlists</span>
            {activeTab === "library" && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-500"></span>}
          </button>

          <button 
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all relative ${activeTab === "favorites" ? "text-pink-400" : "text-white/40 hover:text-white"}`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[9px] font-medium tracking-wider font-display uppercase leading-none">Favorites</span>
            {activeTab === "favorites" && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-500"></span>}
          </button>

          <button 
            onClick={() => setActiveTab("personalize")}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all relative ${activeTab === "personalize" ? "text-pink-400" : "text-white/40 hover:text-white"}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-medium tracking-wider font-display uppercase leading-none">Themes</span>
            {activeTab === "personalize" && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-500"></span>}
          </button>

          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 py-1 px-3 transition-all relative ${activeTab === "profile" ? "text-pink-400" : "text-white/40 hover:text-white"}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-medium tracking-wider font-display uppercase leading-none">Profile</span>
            {activeTab === "profile" && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-500"></span>}
          </button>
        </nav>

      </div>

      {/* --------------------------------------------------------------- */}
      {/* IMMERSIVE SONG PAGE OVERLAY */}
      {/* --------------------------------------------------------------- */}
      {activeSongView && (
        <SongPage 
          song={activeSongView}
          onClose={() => setActiveSongView(null)}
          isPlaying={isPlaying && currentSong?.id === activeSongView.id}
          onPlaySong={(song) => {
            handlePlaySong(song);
            setActiveSongView(song);
          }}
          relatedSongs={songsList.filter(s => s.id !== activeSongView.id)}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          onAddSongToQueue={handleAddSongToQueue}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* FLOATING MEDIA MUSIC PLAYER */}
      {/* --------------------------------------------------------------- */}
      {!showLoginOverlay && (
        <MusicPlayer 
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayPauseToggle={handlePlayPauseToggle}
          onNext={handleNext}
          onPrev={handlePrev}
          onSongClick={handlePlaySong}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          queue={queue}
          setQueue={setQueue}
          onUpdateYtDuration={handleUpdateYtDuration}
          ytPlaybackTrigger={ytPlaybackTrigger}
          openSongPage={(section) => {
            if (currentSong) {
              setActiveSongView(currentSong);
            }
          }}
        />
      )}

      {/* --------------------------------------------------------------- */}
      {/* CUSTOM CONTEXT MENU */}
      {/* --------------------------------------------------------------- */}
      {contextMenu.visible && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/10"
            onClick={(e) => {
              e.stopPropagation();
              if (Date.now() - lastLongPressTimeRef.current < 400) {
                return;
              }
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
          />
          <div 
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 300), 
              left: Math.min(contextMenu.x, window.innerWidth - 220) 
            }}
            className="fixed z-50 min-w-[200px] bg-neutral-950/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl animate-fade-in text-xs font-sans text-white/80"
            onClick={(e) => e.stopPropagation()}
          >
          {contextMenu.type === "song" && contextMenu.song && (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1.5 text-[9px] font-mono text-white/30 uppercase tracking-widest border-b border-white/5 mb-1 truncate">
                {contextMenu.song.title}
              </div>
              
              <button
                onClick={() => {
                  handlePlaySong(contextMenu.song!);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left font-medium text-white/70 hover:text-white"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Play Track</span>
              </button>

              {/* ADD TO PLAYLIST SUBMENU */}
              <div className="relative group/sub">
                <div className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-white/70 hover:text-white">
                  <div className="flex items-center gap-2.5 font-medium">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add to Playlist</span>
                  </div>
                  <ChevronUp className="w-3 h-3 rotate-90 text-white/30" />
                </div>

                {/* SUBMENU PANEL */}
                <div className="absolute left-full top-0 ml-1 min-w-[180px] bg-neutral-950 border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-2xl hidden group-hover/sub:block animate-fade-in">
                  <button
                    onClick={() => {
                      setQuickCreatePlaylistSong(contextMenu.song);
                      setQuickPlaylistName("");
                      setShowQuickCreateModal(true);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-pink-500/10 text-pink-400 hover:text-pink-300 rounded-lg transition-colors text-left font-mono text-[9px] uppercase tracking-wider font-semibold border-b border-white/5 mb-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Playlist</span>
                  </button>

                  {playlists.length === 0 ? (
                    <div className="px-3 py-2 text-[9px] font-mono text-white/20 uppercase tracking-wider text-center">
                      No playlists found
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto">
                      {playlists.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            handleAddSongToPlaylist(contextMenu.song!, p.id);
                            setContextMenu(prev => ({ ...prev, visible: false }));
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-lg transition-colors text-left truncate text-white/60 hover:text-white"
                        >
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {contextMenu.fromPlaylistId && (
                <button
                  onClick={() => {
                    handleRemoveSongFromPlaylist(contextMenu.song!.id, contextMenu.fromPlaylistId!);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-pink-400/80 hover:text-pink-400 hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Playlist</span>
                </button>
              )}

              <button
                onClick={() => {
                  setDeleteConfirmSong(contextMenu.song!);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left font-semibold border-t border-white/5 mt-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete from Library</span>
              </button>
            </div>
          )}

          {contextMenu.type === "playlist" && contextMenu.playlist && (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1.5 text-[9px] font-mono text-white/30 uppercase tracking-widest border-b border-white/5 mb-1 truncate">
                {contextMenu.playlist.name}
              </div>

              <button
                onClick={() => {
                  setSelectedPlaylistId(contextMenu.playlist!.id);
                  setActiveTab("playlist");
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left font-medium text-white/70 hover:text-white"
              >
                <Library className="w-3.5 h-3.5" />
                <span>Open Playlist Page</span>
              </button>

              <button
                onClick={() => {
                  handlePlayPlaylist(contextMenu.playlist!);
                  setContextMenu(prev => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-left font-medium text-white/70 hover:text-white"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Play Playlist</span>
              </button>

              {contextMenu.playlist.owner === "Drishti (You)" && (
                <button
                  onClick={() => {
                    setPlaylists(prev => prev.filter(p => p.id !== contextMenu.playlist!.id));
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    if (selectedPlaylistId === contextMenu.playlist!.id) {
                      setActiveTab("library");
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left font-semibold border-t border-white/5 mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Playlist</span>
                </button>
              )}
            </div>
          )}
        </div>
        </>
      )}

      {/* QUICK CREATE PLAYLIST MODAL FROM CONTEXT MENU */}
      {showQuickCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleQuickCreatePlaylist} className="bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
            <h3 className="text-white font-display text-base font-semibold mb-1">Create Playlist Container</h3>
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-6">Create and add track immediately</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono uppercase tracking-wider text-white/40">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={quickPlaylistName}
                  onChange={(e) => setQuickPlaylistName(e.target.value)}
                  placeholder="e.g., Late Night Jazz"
                  className="h-11 px-3 text-xs text-white bg-white/[0.02] border border-white/10 rounded-xl outline-none focus:border-white/25 w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 font-mono text-[10px] uppercase tracking-widest font-semibold">
              <button
                type="button"
                onClick={() => {
                  setShowQuickCreateModal(false);
                  setQuickCreatePlaylistSong(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer shadow-md"
              >
                Assemble
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* DELETION CONFIRMATION MODAL */}
      {/* --------------------------------------------------------------- */}
      {deleteConfirmSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
            <h3 className="text-white font-display text-base font-semibold mb-2">Delete Track?</h3>
            <p className="text-white/60 text-xs font-light mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white/80 font-normal">"{deleteConfirmSong.title}"</strong> from your library and database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 font-mono text-[10px] uppercase tracking-widest font-semibold">
              <button
                onClick={() => setDeleteConfirmSong(null)}
                className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleConfirmDeleteSong(deleteConfirmSong.id);
                  setDeleteConfirmSong(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
