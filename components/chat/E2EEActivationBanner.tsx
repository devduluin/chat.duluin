"use client";

import { Lock, X } from "lucide-react";
import { Button } from "../ui/button";
import { useChatStore } from "@/store/useChatStore";

interface E2EEActivationBannerProps {
  conversationId: string;
}

export function E2EEActivationBanner({
  conversationId,
}: E2EEActivationBannerProps) {
  const visible = useChatStore(
    (state) => state.e2eeActivationBanner[conversationId] ?? false,
  );
  const dismissE2eeActivationBanner = useChatStore(
    (state) => state.dismissE2eeActivationBanner,
  );

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
      <div className="flex min-w-0 items-center gap-2">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <p className="truncate">
          Obrolan ini sekarang terenkripsi end-to-end
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
        onClick={() => dismissE2eeActivationBanner(conversationId)}
        aria-label="Tutup pemberitahuan enkripsi"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
