import { useState, useEffect, useRef, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { videoCallService } from "@/services/v1/videoCallService";
import { toast } from "sonner";
import {
  initiateCall,
  acceptCall,
  endCall,
} from "@/lib/callSignaling";
import { useCallStore } from "@/store/useCallStore";
import type { StartCallOptions } from "@/hooks/useVoiceCall";

class RingtonePlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;

  start() {
    if (this.audioCtx) return;

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();

    const playRing = () => {
      if (!this.audioCtx) return;

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.frequency.setValueAtTime(400, this.audioCtx.currentTime);
      osc2.frequency.setValueAtTime(450, this.audioCtx.currentTime);

      osc1.type = "sine";
      osc2.type = "sine";

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

export interface VideoTrackItem {
  sid: string;
  participantId: string;
  track: any;
}

export const useVideoCall = (
  conversationId: string,
  userId: string,
  userName: string,
  receiverId?: string,
  onCallConnected?: (isInitiator: boolean) => void,
  onCallEnded?: () => void,
) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [videoTracks, setVideoTracks] = useState<VideoTrackItem[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<any | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const ringtonePlayerRef = useRef<RingtonePlayer | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const shouldSignalEndRef = useRef(true);
  const endCallSignal = useCallStore((s) => s.endCallSignal);
  const outgoingCall = useCallStore((s) => s.outgoingCall);

  useEffect(() => {
    ringtonePlayerRef.current = new RingtonePlayer();
    return () => {
      ringtonePlayerRef.current?.stop();
    };
  }, []);

  const cleanupLiveKit = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      roomRef.current = null;
      try {
        room.disconnect();
      } catch (err) {
        console.error("Error disconnecting room:", err);
      }
    }

    ringtonePlayerRef.current?.stop();

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
    setIsCameraOn(true);
    setVideoTracks([]);
    setLocalVideoTrack(null);
  }, []);

  const sendSignalingEnd = useCallback(() => {
    const peerId = peerIdRef.current;
    const callId = callIdRef.current;
    if (peerId) {
      endCall(peerId, callId || "");
    }
    peerIdRef.current = null;
    callIdRef.current = null;
    useCallStore.getState().clearOutgoingCall();
    useCallStore.getState().clearIncomingCall();
  }, []);

  const leaveCall = useCallback(
    async (options?: { skipSignaling?: boolean }) => {
      if (shouldSignalEndRef.current && !options?.skipSignaling) {
        sendSignalingEnd();
      }
      shouldSignalEndRef.current = true;
      cleanupLiveKit();

      if (onCallEnded) {
        onCallEnded();
      }
    },
    [cleanupLiveKit, onCallEnded, sendSignalingEnd],
  );

  useEffect(() => {
    if (endCallSignal > 0) {
      shouldSignalEndRef.current = false;
      leaveCall({ skipSignaling: true });
      useCallStore.getState().resetEndCallSignal();
    }
  }, [endCallSignal, leaveCall]);

  const startCall = useCallback(
    async (options?: StartCallOptions) => {
      if (isCalling || isConnecting) return;
      setIsConnecting(true);
      ringtonePlayerRef.current?.start();

      const asResponder = options?.asResponder ?? false;

      try {
        if (!asResponder && receiverId) {
          initiateCall(receiverId, "video", conversationId);
          useCallStore.getState().setOutgoingCall({
            receiverId,
            callType: "video",
            conversationId,
            answered: false,
          });
          peerIdRef.current = receiverId;
        } else if (asResponder && options?.peerId) {
          peerIdRef.current = options.peerId;
          callIdRef.current = options.callId || null;
          if (options.callId) {
            acceptCall(options.peerId, options.callId);
          }
        }

        const data = await videoCallService.getLiveKitToken({
          chat_id: conversationId,
          user_id: userId,
          user_name: userName,
        });

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;
        setActiveRoom(room);

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          ringtonePlayerRef.current?.stop();
          useCallStore.getState().markOutgoingAnswered();

          setParticipants((prev) => {
            if (prev.some((p) => p.sid === participant.sid)) return prev;
            return [...prev, participant];
          });
          toast.success(
            `${participant.name || participant.identity} answered the video call!`,
          );
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setParticipants((prev) => {
            const remaining = prev.filter((p) => p.sid !== participant.sid);
            if (remaining.length === 0) {
              toast.info("Lawan bicara telah menutup panggilan.");
              setTimeout(() => {
                shouldSignalEndRef.current = false;
                leaveCall({ skipSignaling: true });
              }, 1000);
            }
            return remaining;
          });
          toast.info(
            `${participant.name || participant.identity} left the video call`,
          );
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Video) {
            setVideoTracks((prev) => {
              const sid = track.sid || publication.trackSid || "";
              if (prev.some((vt) => vt.sid === sid)) return prev;
              return [
                ...prev,
                { sid, participantId: participant.identity, track },
              ];
            });
          } else if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            audioElementsRef.current[participant.sid] = el;
            document.body.appendChild(el);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Video) {
            const sid = track.sid || publication.trackSid || "";
            setVideoTracks((prev) => prev.filter((vt) => vt.sid !== sid));
          } else if (track.kind === Track.Kind.Audio) {
            track.detach();
            if (audioElementsRef.current[participant.sid]) {
              try {
                audioElementsRef.current[participant.sid].remove();
              } catch (err) {
                console.error("Error removing audio element:", err);
              }
              delete audioElementsRef.current[participant.sid];
            }
          }
        });

        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track && publication.track.kind === Track.Kind.Video) {
            setLocalVideoTrack(publication.track);
          }
        });

        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.track && publication.track.kind === Track.Kind.Video) {
            setLocalVideoTrack(null);
          }
        });

        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          setActiveSpeakers(speakers.map((s) => s.identity));
        });

        room.on(RoomEvent.Disconnected, () => {
          shouldSignalEndRef.current = false;
          leaveCall({ skipSignaling: true });
        });

        await room.connect(data.livekit_url, data.token);

        if (room.remoteParticipants.size > 0) {
          ringtonePlayerRef.current?.stop();
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);

        const localCameraPub = Array.from(
          room.localParticipant.videoTrackPublications.values(),
        ).find((pub) => pub.track);
        if (localCameraPub?.track) {
          setLocalVideoTrack(localCameraPub.track);
        }

        setIsCalling(true);
        setIsConnecting(false);
        setParticipants(Array.from(room.remoteParticipants.values()));

        if (room.remoteParticipants.size > 0) {
          toast.success("Video call connected!");
        }

        const isInitiator = !asResponder && room.remoteParticipants.size === 0;
        if (onCallConnected) {
          onCallConnected(isInitiator);
        }
      } catch (error: any) {
        console.error("Failed to start video call:", error);
        toast.error(
          error?.response?.data?.message || "Failed to connect to video call",
        );
        setIsConnecting(false);
        sendSignalingEnd();
        cleanupLiveKit();
      }
    },
    [
      conversationId,
      userId,
      userName,
      receiverId,
      isCalling,
      isConnecting,
      leaveCall,
      cleanupLiveKit,
      onCallConnected,
      sendSignalingEnd,
    ],
  );

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    const currentlyMuted = !isMuted;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(
        !currentlyMuted,
      );
      setIsMuted(currentlyMuted);
      toast.info(currentlyMuted ? "Microphone muted" : "Microphone unmuted");
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
      toast.error("Failed to toggle microphone");
    }
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    if (!roomRef.current) return;
    const currentlyOn = !isCameraOn;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(currentlyOn);
      setIsCameraOn(currentlyOn);
      toast.info(currentlyOn ? "Camera enabled" : "Camera disabled");
    } catch (err) {
      console.error("Failed to toggle camera:", err);
      toast.error("Failed to toggle camera");
    }
  }, [isCameraOn]);

  useEffect(() => {
    if (outgoingCall?.callId && outgoingCall.conversationId === conversationId) {
      callIdRef.current = outgoingCall.callId;
      if (!peerIdRef.current && outgoingCall.receiverId) {
        peerIdRef.current = outgoingCall.receiverId;
      }
    }
  }, [outgoingCall, conversationId]);

  useEffect(() => {
    return () => {
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
    isCameraOn,
    activeRoom,
    participants,
    activeSpeakers,
    videoTracks,
    localVideoTrack,
    startCall,
    leaveCall,
    toggleMute,
    toggleCamera,
  };
};
