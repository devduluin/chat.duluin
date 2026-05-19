"use client";

import React from "react";
import { PhoneOff, Mic, MicOff, Volume2, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceCallOverlayProps {
  isCalling: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  participants: any[];
  activeSpeakers: string[];
  displayName: string;
  onHangUp: () => void;
  onToggleMute: () => void;
}

export function VoiceCallOverlay({
  isCalling,
  isConnecting,
  isMuted,
  participants,
  activeSpeakers,
  displayName,
  onHangUp,
  onToggleMute,
}: VoiceCallOverlayProps) {
  if (!isCalling && !isConnecting) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-lg transition-all duration-300"
      >
        <div className="relative w-full max-w-md p-8 mx-4 bg-gray-900/80 border border-gray-800 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col items-center">
          
          {/* Header Status */}
          <div className="flex flex-col items-center space-y-2 mt-4 text-center">
            <span className="px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-full flex items-center space-x-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{isConnecting ? "Connecting..." : "On Call"}</span>
            </span>
            <h3 className="text-2xl font-bold text-white tracking-wide">{displayName}</h3>
            <p className="text-sm text-gray-400">
              {isConnecting
                ? "Connecting WebRTC Tunnel..."
                : `${participants.length + 1} participant(s) in call`}
            </p>
          </div>

          {/* Active Speakers & Avatar Visualizer */}
          <div className="relative my-16 flex items-center justify-center">
            {/* Visualizer Pulsing Circles for Active Speakers */}
            {!isConnecting && activeSpeakers.length > 0 && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping duration-1000" />
                <div className="absolute w-52 h-52 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-ping duration-750" />
              </>
            )}

            {/* Main Center Avatar Card */}
            <div className="relative z-10 w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-1 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center overflow-hidden">
                {isConnecting ? (
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                ) : (
                  <User className="w-16 h-16 text-gray-300" />
                )}
              </div>
            </div>

            {/* Muted Watermark Overlay */}
            {isMuted && (
              <div className="absolute -bottom-2 right-2 z-20 p-2 bg-red-600 border border-red-500 rounded-full shadow-lg text-white animate-bounce">
                <MicOff className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Connected Participants List */}
          {!isConnecting && (
            <div className="w-full max-h-48 overflow-y-auto mb-10 px-4 space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span>Participant</span>
                <span>Status</span>
              </div>
              
              {/* Local Participant */}
              <div className="flex items-center justify-between text-sm py-1.5 text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                  <span className="font-medium text-white">You</span>
                </div>
                <span className="text-xs text-gray-500 flex items-center space-x-1">
                  {isMuted ? <MicOff className="w-3 h-3 text-red-400" /> : <Mic className="w-3 h-3 text-indigo-400" />}
                  <span>{isMuted ? "Muted" : "Active"}</span>
                </span>
              </div>

              {/* Remote Participants */}
              {participants.map((p) => {
                const isSpeaking = activeSpeakers.includes(p.identity);
                return (
                  <div key={p.sid} className="flex items-center justify-between text-sm py-1.5 text-gray-300">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? "bg-emerald-500" : "bg-gray-700"}`}></div>
                      <span className={isSpeaking ? "font-bold text-emerald-400" : ""}>{p.name || p.identity}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {isSpeaking ? (
                        <span className="text-emerald-400 font-medium flex items-center space-x-1">
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                          <span>Speaking</span>
                        </span>
                      ) : (
                        "Connected"
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Control Panel Buttons */}
          <div className="flex items-center space-x-6 mb-4">
            {/* Toggle Mute Button */}
            <button
              onClick={onToggleMute}
              disabled={isConnecting}
              className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center border shadow-lg ${
                isMuted
                  ? "bg-red-950/40 text-red-400 border-red-900/60 hover:bg-red-950/60"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750"
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Hang Up Button */}
            <button
              onClick={onHangUp}
              className="p-5 rounded-full bg-red-600 hover:bg-red-500 text-white border border-red-500/40 hover:border-red-400 transition-all duration-300 shadow-2xl flex items-center justify-center transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
