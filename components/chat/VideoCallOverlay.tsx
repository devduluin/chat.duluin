"use client";

import React, { useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoCallOverlayProps {
  isCalling: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  participants: any[];
  videoTracks: any[];
  localVideoTrack: any | null;
  displayName: string;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export function VideoParticipant({ track, participantName }: { track: any; participantName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = track.attach();
    el.className = "w-full h-full object-cover rounded-2xl";
    containerRef.current.innerHTML = ""; // Clear existing elements
    containerRef.current.appendChild(el);
    return () => {
      try {
        el.remove();
        track.detach();
      } catch (err) {}
    };
  }, [track]);

  return (
    <div className="relative w-full h-full bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold text-white tracking-wide border border-white/10">
        {participantName}
      </div>
    </div>
  );
}

export function LocalVideoParticipant({ track }: { track: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = track.attach();
    el.className = "w-full h-full object-cover rounded-2xl scale-x-[-1]"; // Mirror effect for natural camera feel
    containerRef.current.innerHTML = ""; // Clear existing elements
    containerRef.current.appendChild(el);
    return () => {
      try {
        el.remove();
        track.detach();
      } catch (err) {}
    };
  }, [track]);

  return (
    <div className="relative w-full h-full bg-gray-950 rounded-2xl overflow-hidden shadow-xl border border-gray-800 flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-10 px-2.5 py-0.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-semibold text-white border border-white/10">
        You
      </div>
    </div>
  );
}

export function VideoCallOverlay({
  isCalling,
  isConnecting,
  isMuted,
  isCameraOn,
  participants,
  videoTracks,
  localVideoTrack,
  displayName,
  onHangUp,
  onToggleMute,
  onToggleCamera,
}: VideoCallOverlayProps) {
  if (!isCalling && !isConnecting) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-300 select-none"
      >
        {/* Main video container */}
        <div className="relative w-full h-full max-w-5xl md:h-[85vh] md:max-h-[750px] p-6 mx-auto bg-gray-900/40 border border-gray-800/80 md:rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between z-20">
            <div className="flex flex-col text-left space-y-0.5">
              <span className={`px-2.5 py-0.5 text-[10px] font-semibold border rounded-full inline-flex items-center space-x-1.5 animate-pulse ${
                isConnecting
                  ? "text-blue-400 bg-blue-950/40 border-blue-900/60"
                  : participants.length === 0
                  ? "text-amber-400 bg-amber-950/40 border-amber-900/60"
                  : "text-emerald-400 bg-emerald-950/40 border-emerald-900/60"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isConnecting ? "bg-blue-400" : participants.length === 0 ? "bg-amber-400" : "bg-emerald-400"
                }`}></span>
                <span>
                  {isConnecting
                    ? "Connecting..."
                    : participants.length === 0
                    ? "Ringing..."
                    : "Connected"}
                </span>
              </span>
              <h3 className="text-lg font-bold text-white tracking-wide mt-1.5">{displayName}</h3>
            </div>
            {/* Status Tooltip/Indicator */}
            {!isConnecting && (
              <span className="text-xs text-gray-400">
                {participants.length === 0 ? "Calling..." : "WebRTC HD Video Active"}
              </span>
            )}
          </div>

          {/* Center Call Area */}
          <div className="relative flex-1 my-6 flex items-center justify-center overflow-hidden">
            {isConnecting ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
                <p className="text-sm font-medium text-gray-300">Initializing secure WebRTC camera stream...</p>
              </div>
            ) : participants.length === 0 ? (
              // Ringing state: Show large preview of local camera
              <div className="w-full h-full max-w-lg aspect-video">
                {localVideoTrack && isCameraOn ? (
                  <LocalVideoParticipant track={localVideoTrack} />
                ) : (
                  <div className="w-full h-full bg-gray-950 rounded-2xl border border-gray-800 flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 rounded-full bg-gray-800 text-gray-400">
                      <VideoOff className="w-12 h-12" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">Camera is disabled</span>
                  </div>
                )}
              </div>
            ) : (
              // Active Call Grid
              <div className="w-full h-full grid grid-cols-1 gap-4 relative">
                {/* Main Remote Feed */}
                {videoTracks.length > 0 ? (
                  <VideoParticipant
                    track={videoTracks[0].track}
                    participantName={displayName}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-950 rounded-2xl border border-gray-800 flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 rounded-full bg-gray-800 text-gray-400">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">Waiting for video stream...</span>
                  </div>
                )}

                {/* Floating Local Camera PIP (Picture-In-Picture) */}
                <div className="absolute bottom-4 right-4 z-20 w-32 h-44 sm:w-40 sm:h-56 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 transform">
                  {localVideoTrack && isCameraOn ? (
                    <LocalVideoParticipant track={localVideoTrack} />
                  ) : (
                    <div className="w-full h-full bg-gray-950 rounded-2xl border border-gray-800 flex flex-col items-center justify-center space-y-2">
                      <VideoOff className="w-6 h-6 text-gray-500" />
                      <span className="text-[10px] text-gray-500 font-medium">Camera Off</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-center space-x-6 z-20 mt-2">
            {/* Toggle Audio Mute */}
            <button
              onClick={onToggleMute}
              disabled={isConnecting}
              className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center border shadow-lg ${
                isMuted
                  ? "bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950/60"
                  : "bg-gray-800/80 text-gray-300 border-gray-700/80 hover:bg-gray-700"
              }`}
            >
              {isMuted ? <MicOff className="w-5.5 h-5.5" /> : <Mic className="w-5.5 h-5.5" />}
            </button>

            {/* Hang Up Call */}
            <button
              onClick={onHangUp}
              className="p-4.5 rounded-full bg-red-650 hover:bg-red-550 text-white border border-red-500/40 hover:border-red-450 transition-all duration-300 shadow-2xl flex items-center justify-center transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6.5 h-6.5" />
            </button>

            {/* Toggle Video/Camera */}
            <button
              onClick={onToggleCamera}
              disabled={isConnecting}
              className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center border shadow-lg ${
                !isCameraOn
                  ? "bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950/60"
                  : "bg-gray-800/80 text-gray-300 border-gray-700/80 hover:bg-gray-700"
              }`}
            >
              {!isCameraOn ? <VideoOff className="w-5.5 h-5.5" /> : <Video className="w-5.5 h-5.5" />}
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
