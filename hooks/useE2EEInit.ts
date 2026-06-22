"use client";

import { useEffect } from "react";
import { ensureDeviceRegistered } from "@/lib/e2ee/device-manager";

export function useE2EEInit(userId: string) {
  useEffect(() => {
    if (!userId) return;

    ensureDeviceRegistered(userId).catch((error) => {
      console.error("Failed to initialize E2EE device:", error);
    });
  }, [userId]);
}
