import Swal from "sweetalert2";
import type { WsHandlerContext, WsResponse } from "../types";

export function handleContactSyncEvent(
  response: WsResponse,
  ctx: WsHandlerContext,
): boolean {
  if (response.message === "contact_sync_started") {
    console.log("🔄 Contact sync started");
    ctx.setIsSyncing(true);

    Swal.fire({
      title: "Syncing Contacts",
      text: "Please wait while we sync your contacts from HRIS...",
      icon: "info",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    return true;
  }

  if (response.message === "contact_sync_completed") {
    console.log("✅ Contact sync completed");
    ctx.setIsSyncing(false);

    const data = response.data as { count?: number } | undefined;
    Swal.fire({
      title: "Sync Completed",
      text: `Contacts have been synced successfully! (${data?.count || 0} contacts)`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
    return true;
  }

  if (response.message === "contact_sync_failed") {
    console.log("❌ Contact sync failed");
    ctx.setIsSyncing(false);

    const data = response.data as { message?: string } | undefined;
    Swal.fire({
      title: "Sync Failed",
      text: data?.message || "Failed to sync contacts",
      icon: "error",
    });
    return true;
  }

  return false;
}
