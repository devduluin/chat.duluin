import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { voiceCallService } from "@/services/v1/voiceCallService";
import { toast } from "sonner";

class RingtonePlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;

  start() {
    if (this.audioCtx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();
    
    const playRing = () => {
      if (!this.audioCtx) return;
      
      // Create pleasant dual-tone frequency pair for a digital telephone ringback
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc1.frequency.setValueAtTime(400, this.audioCtx.currentTime);
      osc2.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      
      osc1.type = "sine";
      osc2.type = "sine";
      
      // Soft, non-intrusive calling volume
      gainNode.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime + 1.5);
      gainNode.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + 1.6);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
      this.oscillators = [osc1, osc2];
      this.gainNode = gainNode;
      
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      }, 1800);
    };

    playRing();
    this.intervalId = setInterval(playRing, 4000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
    
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
    
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

export const useVoiceCall = (
  conversationId: string,
  userId: string,
  userName: string,
  onCallConnected?: () => void,
  onCallEnded?: () => void
) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const ringtonePlayerRef = useRef<RingtonePlayer | null>(null);

  useEffect(() => {
    ringtonePlayerRef.current = new RingtonePlayer();
    return () => {
      ringtonePlayerRef.current?.stop();
    };
  }, []);

  const leaveCall = useCallback(async () => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (err) {
        console.error("Error disconnecting room:", err);
      }
      roomRef.current = null;
    }
    
    // Stop outgoing ringtone
    ringtonePlayerRef.current?.stop();

    // Clean up audio elements from DOM
    Object.values(audioElementsRef.current).forEach((el) => {
      try {
        el.remove();
      } catch (err) {
        console.error("Error removing audio element:", err);
      }
    });
    audioElementsRef.current = {};

    setIsCalling(false);
    setIsConnecting(false);
    setActiveRoom(null);
    setParticipants([]);
    setActiveSpeakers([]);
    setIsMuted(false);

    if (onCallEnded) {
      onCallEnded();
    }
  }, [onCallEnded]);

  const startCall = useCallback(async () => {
    if (isCalling || isConnecting) return;
    setIsConnecting(true);

    // Start playing outgoing ringtone
    ringtonePlayerRef.current?.start();

    try {
      // 1. Get LiveKit token from backend
      const data = await voiceCallService.getLiveKitToken({
        chat_id: conversationId,
        user_id: userId,
        user_name: userName,
      });

      // 2. Initialize Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;
      setActiveRoom(room);

      // 3. Register Event Listeners
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        // Stop outgoing ringtone when someone connects
        ringtonePlayerRef.current?.stop();

        setParticipants((prev) => {
          if (prev.some((p) => p.sid === participant.sid)) return prev;
          return [...prev, participant];
        });
        toast.info(`${participant.name || participant.identity} joined the call`);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants((prev) => {
          const remaining = prev.filter((p) => p.sid !== participant.sid);
          if (remaining.length === 0) {
            toast.info("Lawan bicara telah menutup panggilan.");
            setTimeout(() => {
              leaveCall();
            }, 1000);
          }
          return remaining;
        });
        toast.info(`${participant.name || participant.identity} left the call`);
        
        // Clean up audio elements for this participant
        if (audioElementsRef.current[participant.sid]) {
          try {
            audioElementsRef.current[participant.sid].remove();
          } catch (err) {
            console.error("Error removing audio element:", err);
          }
          delete audioElementsRef.current[participant.sid];
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          audioElementsRef.current[participant.sid] = el;
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        track.detach();
        if (audioElementsRef.current[participant.sid]) {
          try {
            audioElementsRef.current[participant.sid].remove();
          } catch (err) {
            console.error("Error removing audio element:", err);
          }
          delete audioElementsRef.current[participant.sid];
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeakers(speakers.map((s) => s.identity));
      });

      room.on(RoomEvent.Disconnected, () => {
        leaveCall();
      });

      // 4. Connect to Room
      await room.connect(data.livekit_url, data.token);

      // Stop outgoing ringtone if other participants are already connected in the room
      if (room.remoteParticipants.size > 0) {
        ringtonePlayerRef.current?.stop();
      }
      
      // 5. Publish local Audio Track
      await room.localParticipant.setMicrophoneEnabled(true);

      setIsCalling(true);
      setIsConnecting(false);
      setParticipants(Array.from(room.remoteParticipants.values()));
      toast.success("Voice call connected!");
      
      if (onCallConnected) {
        onCallConnected();
      }
    } catch (error: any) {
      console.error("Failed to start voice call:", error);
      toast.error(error?.response?.data?.message || "Failed to connect to voice call");
      setIsConnecting(false);
      leaveCall();
    }
  }, [conversationId, userId, userName, isCalling, isConnecting, leaveCall, onCallConnected]);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const currentlyMuted = !isMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!currentlyMuted);
      setIsMuted(currentlyMuted);
      toast.info(currentlyMuted ? "Microphone muted" : "Microphone unmuted");
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
      toast.error("Failed to toggle microphone");
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      // Disconnect on unmount
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting room on unmount:", err);
        }
      }
    };
  }, []);

  return {
    isCalling,
    isConnecting,
    isMuted,
    activeRoom,
    participants,
    activeSpeakers,
    startCall,
    leaveCall,
    toggleMute,
  };
};
