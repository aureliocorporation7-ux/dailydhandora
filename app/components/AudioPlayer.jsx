'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, Square, Pause, Play, ChevronDown } from 'lucide-react';

export default function AudioPlayer({ text, audioUrl }) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const containerRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Helper to format seconds -> mm:ss
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // 4. 🕵️‍♂️ SCROLL OBSERVER (Spotify Logic)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If button is NOT visible (scrolled past) -> Sticky Mode ON
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // 🧹 CLEANUP: Stop audio on unmount (navigation)
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    // 1. Stop HTML5 Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 2. Stop Browser Native TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 3. Cleanup Memory
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPlaying(false);
  };

  const togglePlay = async () => {
    // ⏸️ PAUSE LOGIC
    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setPlaying(false);
      return;
    }

    // ▶️ RESUME LOGIC (If already loaded)
    if (audioRef.current || (typeof window !== 'undefined' && window.speechSynthesis.paused && window.speechSynthesis.speaking)) {
      if (audioRef.current) {
        await audioRef.current.play();
      } else {
        window.speechSynthesis.resume();
      }
      setPlaying(true);
      return;
    }

    // ▶️ START FRESH LOGIC
    setLoading(true);
    try {
      let url;

      // 1. CHECK FOR PRE-GENERATED CLOUDINARY URL
      if (audioUrl) {
        console.log("Using pre-generated audio:", audioUrl);
        url = audioUrl;
      } else {
        // 2. ATTEMPT SERVER-SIDE AI (Edge TTS)
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) throw new Error('Server AI Unavailable');

        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        objectUrlRef.current = url; // Track for cleanup
      }

      const audio = new Audio(url);
      audio.loop = false;
      audioRef.current = audio;

      // 🕒 Time Update Listener
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      // 📏 Duration Listener
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };

      audio.onended = () => {
        setPlaying(false);
        // We don't nullify audioRef here so user can replay from start if they want? 
        // Or should we? Usually "Ended" means reset. 
        // Let's reset for now to be simple.
        audioRef.current = null;
        setCurrentTime(0);
        setDuration(0);
      };

      await audio.play();
      setPlaying(true);

    } catch (error) {
      console.warn("⚠️ Server TTS failed, falling back to Native Browser Speech:", error.message);

      // 2. FALLBACK TO NATIVE BROWSER SPEECH
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'hi-IN';
        utterance.rate = 1.0;

        const selectVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const hindiVoice = voices.find(v => v.lang === 'hi-IN' || v.name.includes('Hindi'));
          if (hindiVoice) utterance.voice = hindiVoice;

          window.speechSynthesis.speak(utterance);
          setPlaying(true);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = selectVoice;
        } else {
          selectVoice();
        }

        utterance.onend = () => {
          setPlaying(false);
          // Native speech doesn't need "Resume" ref cleanup usually
        };
        utterance.onpause = () => setPlaying(false);
        utterance.onresume = () => setPlaying(true);
        utterance.onerror = () => setPlaying(false);

      } else {
        alert("Sorry, your browser does not support audio reading.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ORIGINAL INLINE BUTTON */}
      <div ref={containerRef}>
        <button
          onClick={togglePlay}
          disabled={loading}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300
            ${loading ? 'bg-neutral-800 cursor-wait' : 'bg-white hover:bg-gray-200 hover:scale-110'}
            ${playing ? 'animate-pulse ring-2 ring-primary' : 'hover:rotate-12'}
          `}
          title={playing ? "Pause" : "Listen to Article"}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : playing ? (
            <Pause className="w-5 h-5 text-black fill-current" />
          ) : (
            <Volume2 className="w-6 h-6 text-black" />
          )}
        </button>
      </div>

      {/* 🎧 STICKY SPOTIFY-STYLE PLAYER (Bottom Fixed) */}
      {/* Show if sticky AND (playing OR audio exists/paused) */}
      {(playing || audioRef.current || loading) && isSticky && (
        <div
          onClick={() => setIsExpanded(true)}
          className={`fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-[9999] animate-in slide-in-from-bottom-5 duration-300 fade-in
            ${isExpanded ? 'bg-black/90 rounded-3xl cursor-default' : 'cursor-pointer'}
          `}
        >
          <div className={`
            bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl ring-1 ring-white/20 transition-all duration-300
            ${isExpanded ? 'rounded-2xl flex-col gap-4 p-4' : 'rounded-full px-6 py-2 flex items-center justify-between'}
          `}>

            {/* TOP ROW: Info + Controls */}
            <div className={`flex items-center justify-between w-full ${isExpanded ? 'mb-2' : ''}`}>
              {/* Left: Info */}
              <div className="flex items-center gap-3 overflow-hidden">
                {!isExpanded && (
                  <div className="flex items-center gap-1 h-3">
                    {playing ? (
                      <>
                        <span className="w-1 h-full bg-primary animate-[music-bar_1s_ease-in-out_infinite]"></span>
                        <span className="w-1 h-2/3 bg-primary animate-[music-bar_1.2s_ease-in-out_infinite_0.1s]"></span>
                        <span className="w-1 h-1/2 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite_0.2s]"></span>
                        <span className="w-1 h-3/4 bg-primary animate-[music-bar_1.1s_ease-in-out_infinite_0.3s]"></span>
                      </>
                    ) : (
                      <>
                        <span className="w-1 h-full bg-primary/50"></span>
                        <span className="w-1 h-2/3 bg-primary/50"></span>
                        <span className="w-1 h-1/2 bg-primary/50"></span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-white tracking-wider">
                    {playing ? 'NOW PLAYING' : 'PAUSED'}
                  </span>
                  <span className={`text-[10px] text-gray-400 truncate ${isExpanded ? 'w-full' : 'max-w-[150px]'}`}>
                    {isExpanded ? text.substring(0, 100) + '...' : text.substring(0, 30) + '...'}
                  </span>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-3">
                {/* Collapse Button (Only when expanded) */}
                {isExpanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                  {playing ? (
                    <Pause className="w-4 h-4 text-black fill-current" />
                  ) : loading ? (
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 text-black fill-current ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* EXPANDED CONTENT: SEEK BAR */}
            {isExpanded && audioRef.current && (
              <div
                className="w-full flex items-center gap-3 animate-in fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-gray-400 min-w-[30px]">
                  {formatTime(currentTime)}
                </span>

                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2 transition-all"
                />

                <span className="text-[10px] text-gray-400 min-w-[30px]">
                  {formatTime(duration)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
