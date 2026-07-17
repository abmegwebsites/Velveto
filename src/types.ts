export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: string; // e.g. "3:45"
  audioUrl: string; // mp3 path
  source: "YouTube" | "Spotify" | "Apple Music" | "SoundCloud" | "Velvet";
  sourceUrl?: string;
  isUnavailable?: boolean;
  replacementQuery?: string;
  lyrics?: string;
  artistBio?: string;
  videoUrl?: string; // YouTube embed code or mock video
  rating?: number;
  comments?: Comment[];
  videoId?: string;      // For YouTube imports
  importedAt?: number;   // Import timestamp
  customTitle?: string;  // For user renaming
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  artwork: string;
  songs: Song[];
  isPublic: boolean;
  owner: string;
  likes: number;
  collaborators?: string[];
  folderId?: string;
  createdAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  playlistIds: string[];
}

export interface ListeningStat {
  topGenres: { genre: string; percentage: number }[];
  listeningMinutes: number;
  songsDiscovered: number;
  favoriteArtists: { name: string; artwork: string; count: number }[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  isFollowing: boolean;
  topGenres: string[];
}
