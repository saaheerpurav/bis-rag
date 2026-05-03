"use client";
import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  onResult: (text: string) => void;
  language: "en" | "hi";
}

export default function VoiceMic({ onResult, language }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  const startRecording = useCallback(() => {
    const SR = (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
               (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      if (text) onResult(text);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }, [language, onResult]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  if (!supported) return null;

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className={`relative flex items-center justify-center gap-2 text-[11px] px-4 py-2.5 border rounded-md uppercase tracking-widest font-semibold transition-all duration-200 ${
        recording
          ? "border-red-500 bg-red-500/10 text-red-400 scale-[1.02]"
          : "border-border text-muted-fg hover:bg-muted hover:text-fg hover:border-border-bright active:scale-95"
      }`}
      title={`Hold to speak (${language === "hi" ? "Hindi" : "English"})`}
    >
      <AnimatePresence>
        {recording && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute inset-0 bg-red-500/10 border border-red-500/50 rounded-md"
          />
        )}
      </AnimatePresence>
      <svg
        className={`w-3.5 h-3.5 relative z-10 flex-shrink-0 ${recording ? "text-red-400" : ""}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm-2 4a5 5 0 0010 0V4a5 5 0 00-10 0v4zm5 6a7 7 0 01-7-7H1a9 9 0 0018 0h-2a7 7 0 01-7 7zm0 0v3m-3 0h6"
          clipRule="evenodd"
        />
      </svg>
      <span className="relative z-10">
        {recording ? "Listening..." : "Hold to Speak"}
      </span>
    </button>
  );
}
