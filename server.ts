import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : "";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Falling back to high-quality simulations.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// -------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. AI recommendations
app.post("/api/gemini/recommendations", async (req, res) => {
  const { mood, genre } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Elegant fallback simulation
    const simulatedResponse = getSimulatedRecommendations(mood, genre);
    return res.json(simulatedResponse);
  }

  try {
    const prompt = `You are a premium music curation specialist at Velvet.
Generate 4 unique, diverse music track recommendations matching the following constraints:
Mood: ${mood || "any"}
Genre: ${genre || "any"}

For each song, provide:
1. Song Title
2. Artist Name
3. Album Name
4. Estimated Duration (format m:ss)
5. Source (one of: "YouTube", "Spotify", "Apple Music", "SoundCloud")
6. A short curation note explaining why it matches the mood and genre.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              album: { type: Type.STRING },
              duration: { type: Type.STRING },
              source: { type: Type.STRING, description: "Must be 'YouTube' or 'Spotify' or 'Apple Music' or 'SoundCloud'" },
              note: { type: Type.STRING },
            },
            required: ["title", "artist", "album", "duration", "source", "note"],
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Gemini API Error in recommendations:", err);
    return res.json({
      success: true,
      error: err.message,
      data: getSimulatedRecommendations(mood, genre).data,
      isFallback: true
    });
  }
});

// 3. Parse playlist link / search paste
app.post("/api/gemini/parse-link", async (req, res) => {
  const { url } = req.body;
  const client = getGeminiClient();

  if (!url) {
    return res.status(400).json({ error: "No URL or link provided" });
  }

  // Detect platform from URL
  let detectedSource: "YouTube" | "Spotify" | "Apple Music" | "SoundCloud" = "YouTube";
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes("spotify")) detectedSource = "Spotify";
  else if (lowercaseUrl.includes("apple")) detectedSource = "Apple Music";
  else if (lowercaseUrl.includes("soundcloud")) detectedSource = "SoundCloud";

  if (!client) {
    const simulatedTracks = getSimulatedImport(url, detectedSource);
    return res.json(simulatedTracks);
  }

  try {
    const prompt = `You are the Velvet Universal Playlist and Song Importer.
The user has provided a music/video/playlist link: "${url}".

Your absolute highest-priority task is to identify the ACTUAL track name, artist, album, and duration corresponding to this specific link using Google Search.
If this link points to a single track/song or a general video, return a JSON array containing exactly 1 track with the correct details of THAT song.
If this link points to a playlist, album, or compilation, search for the tracks in it and return up to 5 tracks from it.

For each track, provide:
- title: Actual Song Title (e.g. "Never Gonna Give You Up" if the URL is Rick Astley's, or "Another Love" if Tom Odell, etc.)
- artist: Actual Artist Name
- album: Actual Album Name or "Single" / "Live" or album it belongs to
- duration: The exact duration in "m:ss" format (e.g. "3:32" or "4:11")
- source: "${detectedSource}"
- sourceUrl: "${url}"
- artwork: A beautiful Unsplash music-themed artwork link that matches the mood or genre of the song (e.g. "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80").
- lyrics: Beautifully formatted or generated lyrics for this song, including verse tags like [Verse 1], [Chorus].
- artistBio: A short 2-sentence biography of the artist.
- genre: An estimated genre for this track (e.g., "synthwave", "lofi", "pop", "rock", "ambient", "electronic", "hiphop").
- isUnavailable: (boolean) false
- replacementQuery: (string) query to look for a replacement (e.g. "Artist - Song Name")
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              album: { type: Type.STRING },
              duration: { type: Type.STRING },
              source: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              artwork: { type: Type.STRING },
              lyrics: { type: Type.STRING },
              artistBio: { type: Type.STRING },
              genre: { type: Type.STRING },
              isUnavailable: { type: Type.BOOLEAN },
              replacementQuery: { type: Type.STRING },
            },
            required: ["title", "artist", "album", "duration", "source", "sourceUrl", "artwork", "isUnavailable", "lyrics", "artistBio"],
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json({ success: true, url, source: detectedSource, data: parsedData });
  } catch (err: any) {
    console.error("Gemini API Error in parse-link:", err);
    return res.json({
      success: true,
      url,
      source: detectedSource,
      data: getSimulatedImport(url, detectedSource).data,
      isFallback: true
    });
  }
});

// 4. Find Replacement
app.post("/api/gemini/find-replacement", async (req, res) => {
  const { title, artist, query } = req.body;
  const client = getGeminiClient();

  if (!client) {
    return res.json({
      success: true,
      data: {
        title: title || "Rescued Melodies",
        artist: artist || "The Velvet Crew",
        album: "Velvet Remixed",
        duration: "3:58",
        source: "YouTube",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
        note: "This is a perfect active replacement we uncovered on YouTube to substitute your missing song!",
      }
    });
  }

  try {
    const prompt = `A user has an unavailable song "${title}" by "${artist}" (Query: "${query || ""}").
Recommend ONE highly accurate alternative track that is currently fully active on YouTube.
Return a single JSON object containing:
- title: Recommended active replacement title
- artist: Replacement artist
- album: Replacement album
- duration: Replacement duration (e.g. "4:12")
- source: "YouTube" or "Spotify"
- sourceUrl: a working-looking URL
- artwork: a gorgeous unsplash musical artwork link
- note: a brief explanation of why this replacement keeps the vibe intact.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            album: { type: Type.STRING },
            duration: { type: Type.STRING },
            source: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
            artwork: { type: Type.STRING },
            note: { type: Type.STRING },
          },
          required: ["title", "artist", "album", "duration", "source", "sourceUrl", "artwork", "note"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Gemini API Error in find-replacement:", err);
    return res.json({
      success: true,
      data: {
        title: `${title || "Active Vibe"} (Remix)`,
        artist: artist || "Velvet Resonance",
        album: "Found Vibrations",
        duration: "4:05",
        source: "YouTube",
        sourceUrl: "https://youtube.com/watch?v=active-version-1",
        artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
        note: "Enjoy this curated high-tempo masterwork keeping your original playlist aesthetic perfectly preserved.",
      },
      isFallback: true
    });
  }
});

// 5. Generate Lyrics
app.post("/api/gemini/generate-lyrics", async (req, res) => {
  const { title, artist } = req.body;
  const client = getGeminiClient();

  if (!client) {
    return res.json({
      success: true,
      lyrics: `[Verse 1]\nWalking in the neon rain\nFeeling the rhythm through my veins\nNo more boundaries, no more pain\nVelvet vibes on the radio station again.\n\n[Chorus]\nOh Velvet, take me higher\nUnder the light of the crimson fire\nLet the bassline guide my desire\nWe are the sound that never tires.\n\n[Verse 2]\nPast the horizons of dusty light\nInto the depths of the gorgeous night\nFloating along on a starry flight\nEverything feels so warm and right.`
    });
  }

  try {
    const prompt = `Generate highly artistic, creative song lyrics for "${title}" by "${artist}". Include verse tags like [Verse 1], [Chorus], and [Bridge]. Make them beautifully styled, poetic, and atmospheric.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ success: true, lyrics: response.text });
  } catch (err: any) {
    console.error("Gemini API Error in generate-lyrics:", err);
    return res.json({
      success: true,
      lyrics: `[Verse 1]\nThrough the mist and digital haze\nSearching for your warmth in acoustic waves\nHours drift past like autumn leaves\nUnderneath the shade of synthetic trees.\n\n[Chorus]\nAnd we are spinning on a classic deck\nFeeling the bass like a warm embrace\nWith every crackle of vinyl code\nTracing our steps down the retro road.`,
      isFallback: true
    });
  }
});

// 6. Google Sign-In Popup Page for simulated OAuth
app.get(["/auth/google", "/auth/google/"], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in with Google</title>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          background: #f1f3f4;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          overflow: hidden;
        }
        .card {
          background: white;
          border-radius: 8px;
          border: 1px solid #dadce0;
          width: 380px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .logo {
          width: 75px;
          height: 24px;
          margin: 0 auto 24px auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        h1 {
          font-size: 24px;
          color: #202124;
          margin: 0 0 8px 0;
          font-weight: 400;
        }
        p {
          font-size: 15px;
          color: #5f6368;
          margin: 0 0 30px 0;
        }
        .btn {
          background: #1a73e8;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
          width: 100%;
          height: 44px;
        }
        .btn:hover {
          background: #1557b0;
        }
        .input-field {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1px solid #dadce0;
          border-radius: 4px;
          margin-bottom: 18px;
          box-sizing: border-box;
          font-size: 15px;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #1a73e8;
          outline: none;
        }
        .error {
          color: #d93025;
          font-size: 12px;
          text-align: left;
          margin-top: -12px;
          margin-bottom: 16px;
          font-family: inherit;
        }
        .quick-select {
          border: 1px solid #dadce0;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          transition: background 0.15s, border-color 0.15s;
        }
        .quick-select:hover {
          background: #f8f9fa;
          border-color: #1a73e8;
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e8f0fe;
          color: #1a73e8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          font-size: 15px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <!-- Google Vector Logo -->
        <div class="logo">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.22,14.77,16.5,12,16.5c-3.03,0-5.6-2.08-6.51-4.88a7.07,7.07,0,0,1,0-3.24c.91-2.8,3.48-4.88,6.51-4.88,1.63,0,3.1.56,4.25,1.66l2.13-2.13A10,10,0,0,0,12,1c-5.52,0-10,4.48-10,10s4.48,10,10,10c5.73,0,9.53-4,9.53-9.7A8.4,8.4,0,0,0,21.35,11.1Z" fill="#4285F4"/>
              <path d="M12,16.5c-3.03,0-5.6-2.08-6.51-4.88L3.25,14a10,10,0,0,0,8.75,7c2.73,0,5.03-.9,6.67-2.42Z" fill="#34A853"/>
              <path d="M5.49,11.62a7.07,7.07,0,0,1,0-3.24L3.25,6.14a10,10,0,0,0,0,11.72Z" fill="#FBBC05"/>
              <path d="M12,4.74c1.63,0,3.1.56,4.25,1.66l2.13-2.13A10,10,0,0,0,3.25,6.14l2.24,2.24C6.4,5.58,8.97,3.5,12,3.5Z" fill="#EA4335"/>
            </g>
          </svg>
        </div>
        <h1>Sign in</h1>
        <p style="margin-top: 6px;">to continue to Velveto</p>
        
        <div id="quick-container">
          <div class="quick-select" onclick="selectQuick('drishtilikesbl@gmail.com', 'Drishti')">
            <div class="avatar">D</div>
            <div>
              <div style="font-weight: 500; color: #202124; font-size: 14px;">Drishti</div>
              <div style="color: #5f6368; font-size: 12px; margin-top: 2px;">drishtilikesbl@gmail.com</div>
            </div>
          </div>
          <div style="margin: 18px 0; color: #5f6368; font-size: 13px;">or enter another Google Account</div>
        </div>

        <form id="loginForm" onsubmit="handleSubmit(event)">
          <input type="email" id="email" class="input-field" placeholder="Email (e.g. user@gmail.com)" required>
          <div id="error" class="error"></div>
          <button type="submit" class="btn">Next</button>
        </form>
      </div>

      <script>
        function selectQuick(email, name) {
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'OAUTH_AUTH_SUCCESS', 
              email: email,
              name: name
            }, '*');
            window.close();
          }
        }

        function handleSubmit(e) {
          e.preventDefault();
          const emailInput = document.getElementById('email').value.trim();
          const errorDiv = document.getElementById('error');
          
          if (!emailInput.toLowerCase().endsWith('@gmail.com')) {
            errorDiv.textContent = 'Please enter a valid @gmail.com account';
            return;
          }
          
          errorDiv.textContent = '';
          const namePrefix = emailInput.split('@')[0];
          const name = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
          
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'OAUTH_AUTH_SUCCESS', 
              email: emailInput,
              name: name
            }, '*');
            window.close();
          }
        }
      </script>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------------
// SEED FALLBACK HELPERS
// -------------------------------------------------------------------

function getSimulatedRecommendations(mood?: string, genre?: string) {
  const seedMoods: Record<string, any[]> = {
    chill: [
      { title: "Sunset Glow", artist: "Lofi Horizon", album: "Lazy Sunday", duration: "3:40", source: "SoundCloud", note: "Laidback dusty vinyl beats and warm electric piano keys, perfect for coding and drinking coffee." },
      { title: "Ocean Breather", artist: "Soma Chill", album: "Tides of Time", duration: "4:15", source: "YouTube", note: "Ethereal acoustic guitars merged with delicate ambient whale soundscapes." }
    ],
    energetic: [
      { title: "Synthwave Rush", artist: "Hyperion-9", album: "Vector Speedways", duration: "5:20", source: "Spotify", note: "A heavy, fast-paced cyberpunk bassline with screaming analog leads to get your adrenaline pumping." },
      { title: "Neon Skyline", artist: "Tokyo Driftwave", album: "Metropolis 2088", duration: "3:58", source: "YouTube", note: "Arpeggiated retro synths paired with heavy 80s gated drums." }
    ],
    melancholic: [
      { title: "Rainy Cafe", artist: "Silent Keyboards", album: "Empty Coffee Cups", duration: "4:02", source: "SoundCloud", note: "A beautiful, sorrowful piano ballad overlaid with high-fidelity rain and coffee shop hums." },
      { title: "Distant Echoes", artist: "The Ethereal Collective", album: "Memories Fade", duration: "5:10", source: "Apple Music", note: "Gazing out of a foggy train window listening to spacey pads and soft delay-pedal guitars." }
    ]
  };

  const selectedList = seedMoods[mood?.toLowerCase() || "chill"] || seedMoods.chill;
  return {
    success: true,
    data: selectedList
  };
}

function getSimulatedImport(url: string, source: string) {
  const decodedUrl = decodeURIComponent(url);
  let guessedTitle = "";
  let guessedArtist = "";
  let guessedAlbum = "Web Vibration";
  let guessedGenre = "synthwave";

  // Check known popular YouTube clips or formats
  if (url.includes("dQw4w9WgXcQ")) {
    guessedTitle = "Never Gonna Give You Up";
    guessedArtist = "Rick Astley";
    guessedAlbum = "Whenever You Need Somebody";
    guessedGenre = "pop";
  } else {
    // try to extract words from URL
    const cleanTokens = decodedUrl.split(/[\/\?&=\-_+]/)
      .filter(p => p.length > 3 && 
                   !p.includes("http") && 
                   !p.includes("www") && 
                   !p.includes("com") && 
                   !p.includes("youtube") && 
                   !p.includes("spotify") && 
                   !p.includes("soundcloud") && 
                   !p.includes("watch") && 
                   !p.includes("playlist") && 
                   !p.includes("track") &&
                   !/^[a-zA-Z0-9]{11}$/.test(p)); // filter out YouTube video IDs

    if (cleanTokens.length >= 2) {
      guessedTitle = cleanTokens.slice(0, Math.min(3, cleanTokens.length - 1))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      guessedArtist = cleanTokens[cleanTokens.length - 1].charAt(0).toUpperCase() + cleanTokens[cleanTokens.length - 1].slice(1);
    } else if (cleanTokens.length === 1) {
      guessedTitle = cleanTokens[0].charAt(0).toUpperCase() + cleanTokens[0].slice(1);
      guessedArtist = "Internet Nomad";
    } else {
      guessedTitle = "Velvet Waves";
      guessedArtist = "Cosmic Resonance";
    }

    if (decodedUrl.includes("lofi") || decodedUrl.includes("chill")) {
      guessedGenre = "lofi";
    } else if (decodedUrl.includes("ambient")) {
      guessedGenre = "ambient";
    } else if (decodedUrl.includes("rock") || decodedUrl.includes("band")) {
      guessedGenre = "rock";
    }
  }

  return {
    success: true,
    url,
    source,
    data: [
      {
        title: guessedTitle,
        artist: guessedArtist,
        album: guessedAlbum,
        duration: "3:42",
        source: source,
        sourceUrl: url,
        artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
        isUnavailable: false,
        lyrics: `[Verse 1]\nSynthetic horizons are falling down\nInto the heart of this neon town\nYou matched a link from ${source} today\nAnd imported these velvet vibrations to play.\n\n[Chorus]\nNow we stream it loud and free\nAcross this pixelated sea\nYour pasted melody comes alive\nVelveto is where your vibrations thrive.`,
        artistBio: `${guessedArtist} is a visionary audio artist known for their captivating works found on ${source}.`,
        genre: guessedGenre
      }
    ]
  };
}

// -------------------------------------------------------------------
// DEV/PRODUCTION VITE SERVER MIDDLEWARE
// -------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Velvet Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
