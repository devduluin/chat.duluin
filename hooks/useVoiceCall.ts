import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { voiceCallService } from "@/services/v1/voiceCallService";
import { toast } from "sonner";

export const useVoiceCall = (conversationId: string, userId: string, userName: string) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  const leaveCall = useCallback(async () => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (err) {
        console.error("Error disconnecting room:", err);
      }
      roomRef.current = null;
    }
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
  }, []);

  const startCall = useCallback(async () => {
    if (isCalling || isConnecting) return;
    setIsConnecting(true);

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
        setParticipants((prev) => {
          if (prev.some((p) => p.sid === participant.sid)) return prev;
          return [...prev, participant];
        });
        toast.info(`${participant.name || participant.identity} joined the call`);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
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
      
      // 5. Publish local Audio Track
      await room.localParticipant.setMicrophoneEnabled(true);

      setIsCalling(true);
      setIsConnecting(false);
      setParticipants(Array.from(room.remoteParticipants.values()));
      toast.success("Voice call connected!");
    } catch (error: any) {
      console.error("Failed to start voice call:", error);
      toast.error(error?.response?.data?.message || "Failed to connect to voice call");
      setIsConnecting(false);
      leaveCall();
    }
  }, [conversationId, userId, userName, isCalling, isConnecting, leaveCall]);

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
