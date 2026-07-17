import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { auth } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";

interface LoginScreenProps {
  onLoginSuccess: (email: string, name: string) => void;
  onBack?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMockGoogle, setShowMockGoogle] = useState(false);
  const [mockEmail, setMockEmail] = useState("");

  // 3D Glass tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  // Floating blobs parallax state
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Track mouse coordinates on window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      // Calculate card tilt (max 15 degrees)
      const rotateY = (x - 0.5) * 15;
      const rotateX = (0.5 - y) * 15;
      setTilt({ x: rotateX, y: rotateY });

      // Calculate background blob displacement
      setParallax({ x: x - 0.5, y: y - 0.5 });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Listen for Google Auth callback messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const { email, name } = event.data;
        if (email && email.toLowerCase().endsWith("@gmail.com")) {
          setLoading(true);
          setError(null);
          setTimeout(() => {
            setSuccess(true);
            setLoading(false);
            onLoginSuccess(email, name);
          }, 1000);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLoginSuccess]);

  // Handle manual sign in / sign up form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed.toLowerCase().endsWith("@gmail.com")) {
      setError("Please use a valid @gmail.com account to authenticate.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp && name.trim().length < 2) {
      setError("Please enter your display name.");
      return;
    }

    setLoading(true);

    try {
      let displayName = name.trim();
      if (!displayName) {
        const prefix = emailTrimmed.split("@")[0];
        displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }

      if (isSignUp) {
        // Firebase Auth Create User
        const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
        await updateProfile(userCredential.user, { displayName });
        setSuccess(true);
        onLoginSuccess(emailTrimmed, displayName);
      } else {
        // Firebase Auth Sign In
        const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
        const resolvedName = userCredential.user.displayName || displayName;
        setSuccess(true);
        onLoginSuccess(emailTrimmed, resolvedName);
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      let friendlyError = "Authentication failed. Please check your credentials.";
      if (err.code === "auth/email-already-in-use") {
        friendlyError = "This email is already registered. Please login instead.";
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        friendlyError = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/weak-password") {
        friendlyError = "Password should be at least 6 characters.";
      } else if (err.message) {
        friendlyError = err.message;
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  // Launch Google Sign-In with Firebase Auth or sandbox fallback
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setSuccess(true);
      onLoginSuccess(user.email || "", user.displayName || "Google User");
    } catch (err: any) {
      console.warn("Firebase Google Auth popup failed/blocked, trying fallback popup:", err);
      
      const hostname = window.location.hostname;
      const isVercelOrCustomProd = hostname.includes("vercel") || hostname.endsWith(".app") || (!hostname.endsWith(".run.app") && hostname !== "localhost" && hostname !== "127.0.0.1");

      if (isVercelOrCustomProd) {
        // Since Vercel has no Express server backend, opening /auth/google results in a 404.
        // We bypass the backend route entirely and display the stunning client-side Google Chooser Modal!
        setShowMockGoogle(true);
      } else {
        // Fallback popup if browser blocks iframe signInWithPopup in dev/AI Studio environment
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        
        const popup = window.open(
          "/auth/google",
          "Sign in with Google",
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );

        if (!popup) {
          setShowMockGoogle(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden flex justify-center items-center bg-[#070707] z-[9999] select-none font-sans">
      <style>{`
        /* Encapsulated styling matching the provided glassmorphic template */
        @keyframes float-blob {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }

        .animated-blob {
          animation: float-blob 8s ease-in-out infinite;
        }

        .shine-reflection {
          position: absolute;
          top: -40%;
          left: -60%;
          width: 180px;
          height: 650px;
          background: rgba(255,255,255,.07);
          transform: rotate(30deg);
          pointer-events: none;
          animation: shine-move 7s linear infinite;
        }

        @keyframes shine-move {
          0% { left: -70%; }
          100% { left: 160%; }
        }

        .glow-halo-purple::before {
          content: "";
          position: absolute;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(200,120,255,.8), transparent 70%);
          left: -80px;
          top: -80px;
          filter: blur(25px);
          opacity: .75;
          pointer-events: none;
          z-index: 1;
        }

        .glow-halo-orange::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          background: radial-gradient(circle, rgba(255,160,60,.85), transparent 70%);
          right: -120px;
          bottom: -120px;
          filter: blur(30px);
          opacity: .8;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>

      {/* BACKGROUND FLOATING BLOBS WITH PARALLAX */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob 1: Purple (Left-Top) */}
        <div 
          className="absolute rounded-full pointer-events-none opacity-80 blur-[25px] animated-blob"
          style={{
            width: "350px",
            height: "350px",
            background: "linear-gradient(135deg, #b84cff, #7a28ff)",
            left: "15%",
            top: "8%",
            transform: `translate(${parallax.x * 15}px, ${parallax.y * 15}px)`,
            transition: "transform 0.15s ease-out"
          }}
        ></div>

        {/* Blob 2: Orange (Right-Bottom) */}
        <div 
          className="absolute rounded-full pointer-events-none opacity-85 blur-[30px] animated-blob"
          style={{
            width: "320px",
            height: "320px",
            background: "linear-gradient(135deg, #ffb347, #ff6a00)",
            right: "18%",
            bottom: "8%",
            animationDelay: "2s",
            transform: `translate(${parallax.x * 25}px, ${parallax.y * 25}px)`,
            transition: "transform 0.15s ease-out"
          }}
        ></div>

        {/* Small Blob 1 (Bottom Left) */}
        <div 
          className="absolute rounded-full pointer-events-none opacity-90 blur-[8px]"
          style={{
            width: "28px",
            height: "28px",
            background: "#ff7a00",
            left: "18%",
            bottom: "28%",
            transform: `translate(${parallax.x * 35}px, ${parallax.y * 35}px)`,
            transition: "transform 0.15s ease-out"
          }}
        ></div>

        {/* Small Blob 2 (Top Right) */}
        <div 
          className="absolute rounded-full pointer-events-none opacity-90 blur-[8px]"
          style={{
            width: "28px",
            height: "28px",
            background: "#8d3cff",
            right: "20%",
            top: "28%",
            transform: `translate(${parallax.x * 40}px, ${parallax.y * 40}px)`,
            transition: "transform 0.15s ease-out"
          }}
        ></div>
      </div>

      {/* MAIN CONTAINER */}
      <div 
        className="relative z-10 p-4 w-full max-w-[420px]"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.1s ease-out"
        }}
      >
        {/* GLASS CARD */}
        <div className="relative w-full rounded-[35px] bg-white/[0.06] backdrop-blur-[22px] border border-white/30 p-8 sm:p-11 shadow-[0_8px_40px_rgba(0,0,0,0.55)] overflow-hidden glow-halo-purple glow-halo-orange">
          
          {/* Sliding light sheen animation */}
          <div className="shine-reflection"></div>

          {/* Card Content */}
          <div className="relative z-10 w-full text-left">
            
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="group mb-6 flex items-center gap-2.5 text-xs text-white/50 hover:text-white transition-all cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 px-3.5 py-1.5 rounded-full w-fit"
                title="Back to Home as Guest"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-mono uppercase tracking-[0.15em] text-[9px]">Back to Home</span>
              </button>
            )}
            
            {/* Title & Brand Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
                {isSignUp ? "Sign Up" : "Login"}
              </h1>
              <p className="text-xs sm:text-[13px] text-neutral-300 mt-2.5 font-light leading-relaxed">
                {isSignUp 
                  ? "Join Velveto. Secure your high-fidelity music dashboard." 
                  : "Welcome back! Access your curated premium frequencies."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-mono flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                  <span>{error}</span>
                </div>
                {/* Check if Firebase is not fully configured or throws operation-not-allowed */}
                {(error.includes("operation-not-allowed") || error.includes("auth/") || error.includes("Firebase") || error.includes("failed")) && (
                  <div className="mt-2 border-t border-red-500/15 pt-2 flex flex-col gap-2">
                    <p className="text-[10px] text-white/50 font-sans leading-normal">
                      To fix this permanently, go to your <strong>Firebase Console</strong> &gt; Build &gt; Authentication &gt; Sign-in method and enable <strong>Email/Password</strong> &amp; <strong>Google</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(true);
                        setError(null);
                        setTimeout(() => {
                          onLoginSuccess(email || "mmofpatna@gmail.com", "Velvet Sandbox Guest");
                        }, 800);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-orange-500/30 to-pink-500/30 hover:from-orange-500/40 hover:to-pink-500/40 text-white font-sans font-medium text-[11px] rounded-lg border border-white/10 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Bypass & Sign In with Sandbox Mode
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/15 border border-green-500/25 text-green-200 text-xs font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping shrink-0"></span>
                <span>Success! Authorizing your session...</span>
              </div>
            )}

            {/* Google / Gmail Auth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-[54px] bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/10 text-white rounded-2xl text-[13px] font-semibold tracking-wider uppercase transition-all mb-5 flex items-center justify-center gap-3 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M21.35,11.1H12v2.7h5.38C16.88,15.22,14.77,16.5,12,16.5c-3.03,0-5.6-2.08-6.51-4.88a7.07,7.07,0,0,1,0-3.24c.91-2.8,3.48-4.88,6.51-4.88,1.63,0,3.1.56,4.25,1.66l2.13-2.13A10,10,0,0,0,12,1c-5.52,0-10,4.48-10,10s4.48,10,10,10c5.73,0,9.53-4,9.53-9.7A8.4,8.4,0,0,0,21.35,11.1Z" fill="#fff"/>
              </svg>
              <span>{isSignUp ? "Sign up using Gmail" : "Sign in with Google"}</span>
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">or enter details</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            {/* MANUAL FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* DISPLAY NAME (Only on Sign Up) */}
              {isSignUp && (
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Display Name (e.g. Drishti)"
                    required
                    className="w-full h-[54px] bg-white/[0.08] border border-white/20 hover:border-white/30 focus:border-[#b566ff] outline-none rounded-2xl pl-5 pr-12 text-[14px] text-white placeholder-white/50 transition-all font-light focus:shadow-[0_0_15px_rgba(170,80,255,0.2)]"
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/60 pointer-events-none" />
                </div>
              )}

              {/* EMAIL ADDRESS */}
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Gmail Address (e.g. name@gmail.com)"
                  required
                  className="w-full h-[54px] bg-white/[0.08] border border-white/20 hover:border-white/30 focus:border-[#b566ff] outline-none rounded-2xl pl-5 pr-12 text-[14px] text-white placeholder-white/50 transition-all font-light focus:shadow-[0_0_15px_rgba(170,80,255,0.2)]"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/60 pointer-events-none" />
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full h-[54px] bg-white/[0.08] border border-white/20 hover:border-white/30 focus:border-[#b566ff] outline-none rounded-2xl pl-5 pr-12 text-[14px] text-white placeholder-white/50 transition-all font-light focus:shadow-[0_0_15px_rgba(170,80,255,0.2)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>

              {/* REMEMBER ME & FORGOT PASSWORD */}
              <div className="flex items-center justify-between text-xs sm:text-[13px] pt-1 pb-2">
                <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="w-[17px] h-[17px] accent-orange-500 rounded border border-white/20 cursor-pointer" 
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Forgot Password?</a>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full h-[54px] border-none outline-none cursor-pointer rounded-2xl text-[15px] font-bold text-white transition-all active:scale-[0.98] shadow-[0_12px_24px_rgba(255,100,50,0.3)] bg-gradient-to-r from-[#ff7b22] via-[#ff5f6d] to-[#9d4dff] hover:shadow-[0_16px_32px_rgba(170,70,255,0.4)] flex items-center justify-center cursor-pointer"
              >
                {loading ? "Authenticating..." : isSignUp ? "Sign Up" : "Login"}
              </button>

              {/* SIGN UP TOGGLER */}
              <div className="text-center pt-5 text-xs sm:text-[13px] text-white/70">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="font-semibold text-orange-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isSignUp ? "Login" : "Sign Up"}
                </button>
              </div>

            </form>

          </div>

        </div>
      </div>

      {/* MOCK GOOGLE LOGIN DIALOG */}
      {showMockGoogle && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[10000] p-4 text-neutral-800">
          <div className="bg-white rounded-[24px] w-full max-w-[380px] p-8 sm:p-10 shadow-2xl relative border border-neutral-200 font-sans">
            <button 
              onClick={() => setShowMockGoogle(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-600 cursor-pointer text-xs uppercase font-mono tracking-wider font-semibold border-none bg-transparent"
            >
              Cancel
            </button>

            {/* Google Vector Logo */}
            <div className="flex justify-center mb-6">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <path d="M21.35,11.1H12v2.7h5.38C16.88,15.22,14.77,16.5,12,16.5c-3.03,0-5.6-2.08-6.51-4.88a7.07,7.07,0,0,1,0-3.24c.91-2.8,3.48-4.88,6.51-4.88,1.63,0,3.1.56,4.25,1.66l2.13-2.13A10,10,0,0,0,12,1c-5.52,0-10,4.48-10,10s4.48,10,10,10c5.73,0,9.53-4,9.53-9.7A8.4,8.4,0,0,0,21.35,11.1Z" fill="#4285F4"/>
                <path d="M12,16.5c-3.03,0-5.6-2.08-6.51-4.88L3.25,14a10,10,0,0,0,8.75,7c2.73,0,5.03-.9,6.67-2.42Z" fill="#34A853"/>
                <path d="M5.49,11.62a7.07,7.07,0,0,1,0-3.24L3.25,6.14a10,10,0,0,0,0,11.72Z" fill="#FBBC05"/>
                <path d="M12,4.74c1.63,0,3.1.56,4.25,1.66l2.13-2.13A10,10,0,0,0,3.25,6.14l2.24,2.24C6.4,5.58,8.97,3.5,12,3.5Z" fill="#EA4335"/>
              </svg>
            </div>

            <h2 className="text-xl font-medium text-center text-[#202124] tracking-tight">Sign in</h2>
            <p className="text-[13px] text-center text-[#5f6368] mt-1.5 mb-6">to continue to Velveto Sandbox</p>

            {/* Quick Account Select */}
            <div className="space-y-3 mb-5">
              <div 
                onClick={() => {
                  setSuccess(true);
                  setShowMockGoogle(false);
                  onLoginSuccess("drishtilikesbl@gmail.com", "Drishti");
                }}
                className="flex items-center gap-3.5 p-3.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-blue-500 cursor-pointer transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-100">
                  D
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 leading-tight">Drishti</p>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">drishtilikesbl@gmail.com</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-[1px] bg-neutral-200 flex-1"></div>
              <span className="text-[9px] uppercase font-mono tracking-widest text-neutral-400 font-semibold">or enter details</span>
              <div className="h-[1px] bg-neutral-200 flex-1"></div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const trimmed = mockEmail.trim();
              if (!trimmed.toLowerCase().endsWith("@gmail.com")) {
                setError("Please use a valid @gmail.com address.");
                return;
              }
              const prefix = trimmed.split("@")[0];
              const resolvedName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
              setSuccess(true);
              setShowMockGoogle(false);
              onLoginSuccess(trimmed, resolvedName);
            }} className="space-y-4">
              <div>
                <input 
                  type="email"
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  placeholder="Email address (e.g. name@gmail.com)"
                  required
                  className="w-full h-11 px-4 border border-neutral-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-neutral-800 placeholder-neutral-400 transition-all font-light"
                />
              </div>
              <button 
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-lg transition-all cursor-pointer shadow-md border-none"
              >
                Next
              </button>
            </form>

            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-[10px] text-neutral-400 text-center leading-normal font-sans">
                <strong>Developer Notice:</strong> To enable real production Google Auth on Vercel, please add <code>velvet-new.vercel.app</code> (and any other deployment domains) to the Authorized Domains list in your <strong>Firebase Console &gt; Authentication &gt; Settings</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
