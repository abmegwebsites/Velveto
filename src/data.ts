import { Song, Playlist, Achievement, Creator } from "./types";

export const SEED_SONGS: Song[] = [
  {
    id: "v1",
    title: "Another Love",
    artist: "Tom Odell",
    album: "Long Way Down",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    duration: "3:58",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    source: "Velvet",
    lyrics: `[Verse 1]\nI wanna take you somewhere so you know I care\nBut it's so cold and I don't know where\nI brought you daffodils in a pretty wind\nBut they won't flower next year, and I'm sad for that.`,
    artistBio: "Tom Odell is an English singer-songwriter known for his soaring piano ballads and emotional raw vocal delivery.",
    rating: 4.9,
    comments: []
  },
  {
    id: "v2",
    title: "Someone You Loved",
    artist: "Lewis Capaldi",
    album: "Divinely Uninspired",
    artwork: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
    duration: "3:02",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    source: "Velvet",
    lyrics: `[Verse 1]\nI'm going under, and this time I fear there's no one to save me\nThis all or nothing really got a way of driving me crazy\nI need somebody to heal, somebody to know, somebody to have\nJust to know how it feels.`,
    artistBio: "Lewis Capaldi is a Scottish singer-songwriter who rose to global fame with his emotional power balladry.",
    rating: 4.8,
    comments: []
  },
  {
    id: "v3",
    title: "I Ain't Worried",
    artist: "OneRepublic",
    album: "Top Gun: Maverick",
    artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
    duration: "2:28",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    source: "Velvet",
    lyrics: `[Verse 1]\nI don't know what you've been told\nBut time is running out, so spend it like it's gold\nI'm living like I'm nine-to-five, but I'm nine-to-five-billion\nNo problems on my head, I'm feeling like a million.`,
    artistBio: "OneRepublic is an American pop rock band formed in Colorado Springs, known for chart-topping anthems.",
    rating: 4.7,
    comments: []
  },
  {
    id: "v4",
    title: "Sweater Weather",
    artist: "The Neighbourhood",
    album: "I Love You.",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    duration: "4:00",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    source: "Velvet",
    lyrics: `[Verse 1]\nAll I am is a man\nI want the world in my hands\nI hate the beach but I stand\nIn California with my toes in the sand.`,
    artistBio: "The Neighbourhood is an American indie rock band known for their atmospheric dark pop aesthetic.",
    rating: 4.9,
    comments: []
  },
  {
    id: "v5",
    title: "Photograph",
    artist: "Ed Sheeran",
    album: "x (Multiply)",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    duration: "4:18",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    source: "Velvet",
    lyrics: `[Verse 1]\nLoving can hurt, loving can hurt sometimes\nBut it's the only thing that I know\nWhen it gets hard, you know it can get hard sometimes\nIt is the only thing makes us feel alive.`,
    artistBio: "Ed Sheeran is an English singer-songwriter with massive global popularity and acoustic-pop masterpieces.",
    rating: 4.9,
    comments: []
  },
  {
    id: "v6",
    title: "Happier",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    artwork: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=500&auto=format&fit=crop&q=80",
    duration: "3:27",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    source: "Velvet",
    rating: 4.6,
    comments: []
  },
  {
    id: "v7",
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
    duration: "4:23",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    source: "Velvet",
    rating: 4.9,
    comments: []
  },
  {
    id: "v8",
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    album: "x (Multiply)",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
    duration: "4:41",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    source: "Velvet",
    rating: 4.8,
    comments: []
  },
  {
    id: "v9",
    title: "Fix You",
    artist: "Coldplay",
    album: "X&Y",
    artwork: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80",
    duration: "4:55",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    source: "Velvet",
    rating: 4.9,
    comments: []
  },
  {
    id: "v10",
    title: "The Scientist",
    artist: "Coldplay",
    album: "A Rush of Blood to the Head",
    artwork: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=500&auto=format&fit=crop&q=80",
    duration: "5:09",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    source: "Velvet",
    rating: 4.8,
    comments: []
  },
  {
    id: "v11",
    title: "Yellow",
    artist: "Coldplay",
    album: "Parachutes",
    artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    duration: "4:29",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    source: "Velvet",
    rating: 4.9,
    comments: []
  },
  {
    id: "v12",
    title: "Viva La Vida",
    artist: "Coldplay",
    album: "Viva la Vida or Death",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    duration: "4:02",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    source: "Velvet",
    rating: 4.7,
    comments: []
  },
  {
    id: "v13",
    title: "Sunflower",
    artist: "Post Malone, Swae Lee",
    album: "Spider-Man: Into the Spider-Verse",
    artwork: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
    duration: "2:38",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    source: "Velvet",
    rating: 4.8,
    comments: []
  },
  {
    id: "v14",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
    duration: "3:20",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    source: "Velvet",
    rating: 4.9,
    comments: []
  },
  {
    id: "v15",
    title: "Save Your Tears",
    artist: "The Weeknd",
    album: "After Hours",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
    duration: "3:35",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    source: "Velvet",
    rating: 4.8,
    comments: []
  },
  {
    id: "v16",
    title: "Starboy",
    artist: "The Weeknd",
    album: "Starboy",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    duration: "3:50",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    source: "Velvet",
    rating: 4.9,
    comments: []
  }
];

export const MOOD_PLAYLISTS: Playlist[] = [
  {
    id: "m1",
    name: "Daily Mix 1",
    description: "Coldplay, Ed Sheeran, The Chainsmokers and more",
    artwork: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80",
    songs: [SEED_SONGS[4], SEED_SONGS[5], SEED_SONGS[8], SEED_SONGS[9]],
    isPublic: true,
    owner: "Velvet Curation",
    likes: 1250,
  },
  {
    id: "m2",
    name: "Daily Mix 2",
    description: "Arijit Singh, Atif Aslam, Pritam and more",
    artwork: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
    songs: [SEED_SONGS[0], SEED_SONGS[1], SEED_SONGS[2]],
    isPublic: true,
    owner: "Velvet Curation",
    likes: 980,
  },
  {
    id: "m3",
    name: "Chill Mix",
    description: "Lana Del Rey, Cigarettes After Sex, Joji and more",
    artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
    songs: [SEED_SONGS[3], SEED_SONGS[12]],
    isPublic: true,
    owner: "Velvet Curation",
    likes: 640,
  },
  {
    id: "m4",
    name: "Energy Boost",
    description: "Imagine Dragons, The Weeknd, OneRepublic...",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    songs: [SEED_SONGS[2], SEED_SONGS[13], SEED_SONGS[14], SEED_SONGS[15]],
    isPublic: true,
    owner: "Velvet Curation",
    likes: 850,
  },
  {
    id: "m5",
    name: "Focus Mix",
    description: "Hans Zimmer, Ludovico Einaudi, Ólafur Arnalds...",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    songs: [SEED_SONGS[0], SEED_SONGS[4]],
    isPublic: true,
    owner: "Velvet Curation",
    likes: 1100,
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "a1",
    title: "Velvet Explorer",
    description: "Listen to your first track on Velvet.",
    icon: "Compass",
    unlockedAt: "2026-07-13T19:10:00Z"
  },
  {
    id: "a2",
    title: "Global Importer",
    description: "Import a playlist link from YouTube, Spotify, or Apple Music.",
    icon: "Globe"
  },
  {
    id: "a3",
    title: "Vinyl Collector",
    description: "Create 3 custom playlists in your Library.",
    icon: "Disc"
  },
  {
    id: "a4",
    title: "Rescuer of Lost Tunes",
    description: "Successfully replace an 'Unavailable' song with an active source.",
    icon: "LifeBuoy"
  },
  {
    id: "a5",
    title: "Velvet VIP",
    description: "Unlock all achievements and master Velvet Discovery.",
    icon: "Crown"
  }
];

export const CREATORS: Creator[] = [
  {
    id: "cr1",
    name: "Elena Geller",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    followers: 12400,
    isFollowing: true,
    topGenres: ["Ambient", "Chillout", "Neoclassical"]
  },
  {
    id: "cr2",
    name: "Marcus Vane",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    followers: 8900,
    isFollowing: false,
    topGenres: ["Synthwave", "Cyberpunk", "Synth-pop"]
  },
  {
    id: "cr3",
    name: "Sola Beatmaker",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    followers: 15100,
    isFollowing: false,
    topGenres: ["Lofi", "Jazzhop", "Boom-Bap"]
  }
];
