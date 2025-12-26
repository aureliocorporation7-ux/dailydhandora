'use client';

import { useState, useRef } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';

export default function AudioPlayer({ text }) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    // 🛑 STOP LOGIC (If already playing, stop everything)
    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0; // Reset
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlaying(false);
      return;
    }

    // ▶️ START LOGIC
    setLoading(true);
    try {
      // 1. ATTEMPT SERVER-SIDE AI (Hugging Face / Google Stream)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Server AI Unavailable');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play();
      setPlaying(true);

    } catch (error) {
      console.warn("⚠️ Server TTS failed, falling back to Native Browser Speech:", error.message);
      
      // 2. FALLBACK TO NATIVE BROWSER SPEECH (Web Speech API)
      if ('speechSynthesis' in window) {
        // Strip HTML again just in case
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        
        window.speechSynthesis.cancel(); // Clear any pending speech

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

        utterance.onend = () => setPlaying(false);
        utterance.onerror = () => setPlaying(false);

      } else {
        alert("Sorry, your browser does not support audio reading.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={loading}
      className={`
        flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300
        ${loading ? 'bg-neutral-800 cursor-wait' : 'bg-white hover:bg-gray-200 hover:scale-110'}
        ${playing ? 'animate-pulse ring-2 ring-primary' : ''}
      `}
      title={playing ? "Stop Reading" : "Listen to Article"}
    >
      {loading ? (
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      ) : playing ? (
        <Square className="w-5 h-5 text-red-600 fill-current" />
      ) : (
        <Volume2 className="w-6 h-6 text-black" />
      )}
    </button>
  );
}
