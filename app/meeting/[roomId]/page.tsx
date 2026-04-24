"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  PreJoin,
  useToken,
} from "@livekit/components-react";
import "@livekit/components-styles";

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const initialName = searchParams.get("name") || "";

  // State
  const [token, setToken] = useState("");
  const [preJoinChoices, setPreJoinChoices] = useState<{
    userChoices?: any;
    username?: string;
  }>({});

  // Backend LiveKit WebSocket URL
  // If backend is on localhost, LiveKit server is typically on ws://localhost:7880
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  // Handle when user submits the PreJoin form
  const handlePreJoinSubmit = async (values: any) => {
    setPreJoinChoices({ userChoices: values, username: values.username });
    
    try {
      // Get token from our Chat Backend (Golang)
      const baseUrl = process.env.NEXT_PUBLIC_GATEWAY_API_URL_DEV || "http://localhost:9999/api/proxy/v1/chat";
      const res = await fetch(`${baseUrl}/meeting/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomId,
          guest_name: values.username || "Guest",
        }),
      });

      const data = await res.json();
      if (data.status && data.data?.token) {
        setToken(data.data.token);
      } else {
        alert("Failed to join meeting: " + data.message);
      }
    } catch (error) {
      console.error("Error joining meeting:", error);
      alert("Error joining meeting");
    }
  };

  // If token is empty, show PreJoin (Lobby)
  if (token === "") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <PreJoin
          defaults={{
            username: initialName,
            videoEnabled: true,
            audioEnabled: true,
          }}
          onSubmit={handlePreJoinSubmit}
          className="bg-gray-800 p-8 rounded-lg shadow-xl"
        />
      </div>
    );
  }

  // If token exists, connect to LiveKit Room
  return (
    <div className="h-screen w-full bg-black text-white">
      <LiveKitRoom
        video={preJoinChoices.userChoices?.videoEnabled}
        audio={preJoinChoices.userChoices?.audioEnabled}
        token={token}
        serverUrl={liveKitUrl}
        // Use the default VideoConference UI
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={() => {
          // When meeting ends or user leaves
          alert("You have left the meeting.");
          window.location.href = "/";
        }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
