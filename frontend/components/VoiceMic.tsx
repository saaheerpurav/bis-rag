"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onResult: (blob: Blob) => void;
  language: "en" | "hi";
}

export default function VoiceMic({ onResult, language }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onResult(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setSupported(false);
    }
  }, [onResult]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  if (!supported) return null;

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className="relative flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:border-indigo-500 transition-all"
      title={`Hold to speak (${language === "hi" ? "Hindi" : "English"})`}
    >
      <AnimatePresence>
        {recording && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute inset-0 rounded-lg bg-red-500/20 border border-red-500/50"
          />
        )}
      </AnimatePresence>
      <svg className={`w-3.5 h-3.5 relative z-10 ${recording ? "text-red-400" : ""}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a4 4 0 100-8 4 4 0 000 8zm0 2a6 6 0 00-6 6h12a6 6 0 00-6-6z" opacity="0"/>
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm-2 4a5 5 0 0010 0V4a5 5 0 00-10 0v4zm5 6a7 7 0 01-7-7H1a9 9 0 0018 0h-2a7 7 0 01-7 7zm0 0v3m-3 0h6" clipRule="evenodd"/>
      </svg>
      <span className="relative z-10">{recording ? "Recording..." : "Hold to speak"}</span>
    </button>
  );
}
