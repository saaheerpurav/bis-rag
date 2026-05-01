"use client";
import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      className={`relative flex items-center gap-2 text-xs md:text-sm px-4 py-2.5 border-2 uppercase tracking-widest font-bold transition-all duration-200 ${
        recording
          ? "border-red-500 bg-red-500/10 text-red-400"
          : "border-border text-muted-fg hover:bg-fg hover:text-bg hover:border-fg"
      }`}
      title={`Hold to speak (${language === "hi" ? "Hindi" : "English"})`}
    >
      <AnimatePresence>
        {recording && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute inset-0 bg-red-500/10 border-2 border-red-500/50"
          />
        )}
      </AnimatePresence>
      <svg
        className={`w-4 h-4 relative z-10 ${recording ? "text-red-400" : ""}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          d="M10 12a4 4 0 100-8 4 4 0 000 8zm0 2a6 6 0 00-6 6h12a6 6 0 00-6-6z"
          opacity="0"
        />
        <path
          fillRule="evenodd"
          d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm-2 4a5 5 0 0010 0V4a5 5 0 00-10 0v4zm5 6a7 7 0 01-7-7H1a9 9 0 0018 0h-2a7 7 0 01-7 7zm0 0v3m-3 0h6"
          clipRule="evenodd"
        />
      </svg>
      <span className="relative z-10">
        {recording ? "RECORDING..." : "HOLD TO SPEAK"}
      </span>
    </button>
  );
}
