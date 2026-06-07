// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleSetting } from "@/components/ui/setting-block";
import { useAccountStore } from "@/store/useAccountStore";
import { getUserById, updateUserSettings } from "@/services/chatUserService";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { ArrowLeft, Settings, Bell, Palette, Globe, Sun, Moon, Check, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { theme: activeTheme, setTheme: setActiveTheme } = useTheme();
  const { data: accountData, setData: setAccountData } = useAccountStore();
  const userId = typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState("light");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    async function fetchUserSettings() {
      try {
        const response = await getUserById(userId);
        if (response && response.status) {
          const user = response.data;
          const settings = user.settings;

          if (settings) {
            setSelectedTheme(settings.theme || "light");
            setSelectedLanguage(settings.language || "en");

            if (settings.notification_prefs) {
              const prefs = settings.notification_prefs;
              setEmailNotifications(prefs.email !== false);
              setPushNotifications(prefs.push !== false);
            }
          }
        } else {
          toast.error("Failed to load settings from server");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        toast.error("Failed to load settings details");
      } finally {
        setLoading(false);
      }
    }

    fetchUserSettings();
  }, [userId, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const prefs = {
        email: emailNotifications,
        push: pushNotifications,
      };

      const response = await updateUserSettings(userId, selectedTheme, selectedLanguage, prefs);

      if (response && response.status) {
        setActiveTheme(selectedTheme);

        if (accountData) {
          setAccountData({
            ...accountData,
            settings: response.data,
          });
        }

        toast.success("Settings saved successfully");
      } else {
        toast.error(response?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("An error occurred while saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Sidebar: hidden on mobile, shown on md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen h-screen bg-gray-50/50 dark:bg-gray-950/40 overflow-y-auto">
        {/* Header */}
        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 flex items-center gap-3 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-500 flex-shrink-0" />
              Settings
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Customize notification alerts, workspace layouts, and languages
            </p>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-5 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">

              {/* Notification preferences card */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                    <Bell className="w-4 h-4 text-green-500" /> Notification Alerts
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Control how the system notifies you about incoming updates and alerts
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="p-4 bg-gray-50/50 dark:bg-gray-950/40 rounded-2xl border border-gray-150/60 dark:border-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors duration-200 opacity-60">
                    <ToggleSetting
                      icon={<Bell className="w-4 h-4 text-gray-400 mt-0.5" />}
                      label="Email Alerts"
                      description="Receive automatic email logs of messages sent while you are offline"
                      value={emailNotifications}
                      onChange={setEmailNotifications}
                      disabled={true}
                    />
                  </div>

                  <div className="p-4 bg-gray-50/50 dark:bg-gray-950/40 rounded-2xl border border-gray-150/60 dark:border-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors duration-200">
                    <ToggleSetting
                      icon={<Bell className="w-4 h-4 text-gray-400 mt-0.5" />}
                      label="Desktop Push Notifications"
                      description="Get instant workspace popups when messages are received in your rooms"
                      value={pushNotifications}
                      onChange={async (checked) => {
                        if (checked) {
                          if (typeof window !== "undefined" && "Notification" in window) {
                            const permission = Notification.permission;
                            
                            if (permission === "denied") {
                              toast.error("Notifikasi diblokir oleh browser", {
                                description: "Silakan aktifkan izin notifikasi secara manual lewat pengaturan browser Anda (ikon gembok di samping URL).",
                                duration: 5000,
                              });
                              setPushNotifications(false);
                              return;
                            }

                            if (permission === "default") {
                              const res = await Notification.requestPermission();
                              if (res !== "granted") {
                                toast.error("Izin notifikasi ditolak");
                                setPushNotifications(false);
                                return;
                              }
                            }
                          }
                        }
                        setPushNotifications(checked);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Theme Settings card */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                    <Palette className="w-4 h-4 text-green-500" /> Theme Selection
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Adjust the display profile style of the chat app interface
                  </p>
                </div>

                {/* Theme options: stacked on mobile, 3-col on sm+ */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {/* Light Theme */}
                  <div
                    onClick={() => setSelectedTheme("light")}
                    className={cn(
                      "cursor-pointer rounded-2xl border p-3 sm:p-5 flex flex-col items-center gap-2 transition-all duration-300",
                      selectedTheme === "light"
                        ? "border-green-500 bg-green-50/10 dark:bg-green-950/15 shadow-sm ring-1 ring-green-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                    )}
                  >
                    <div className={cn(
                      "p-2 sm:p-3 rounded-xl transition-all duration-300",
                      selectedTheme === "light"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 text-center leading-tight">Light</span>
                      {selectedTheme === "light" && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />}
                    </div>
                  </div>

                  {/* Dark Theme */}
                  <div
                    onClick={() => setSelectedTheme("dark")}
                    className={cn(
                      "cursor-pointer rounded-2xl border p-3 sm:p-5 flex flex-col items-center gap-2 transition-all duration-300",
                      selectedTheme === "dark"
                        ? "border-green-500 bg-green-50/10 dark:bg-green-950/15 shadow-sm ring-1 ring-green-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                    )}
                  >
                    <div className={cn(
                      "p-2 sm:p-3 rounded-xl transition-all duration-300",
                      selectedTheme === "dark"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 text-center leading-tight">Dark</span>
                      {selectedTheme === "dark" && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />}
                    </div>
                  </div>

                  {/* System Theme */}
                  <div
                    onClick={() => setSelectedTheme("system")}
                    className={cn(
                      "cursor-pointer rounded-2xl border p-3 sm:p-5 flex flex-col items-center gap-2 transition-all duration-300",
                      selectedTheme === "system"
                        ? "border-green-500 bg-green-50/10 dark:bg-green-950/15 shadow-sm ring-1 ring-green-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                    )}
                  >
                    <div className={cn(
                      "p-2 sm:p-3 rounded-xl transition-all duration-300",
                      selectedTheme === "system"
                        ? "bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 text-center leading-tight">System</span>
                      {selectedTheme === "system" && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Language Preferences Card */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                    <Globe className="w-4 h-4 text-green-500" /> Language Preferences
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select your preferred language translation key for the workspace UI
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1 pointer-events-none opacity-50 select-none">
                  {/* English Option */}
                  <div
                    onClick={() => setSelectedLanguage("en")}
                    className={cn(
                      "flex-1 cursor-pointer rounded-2xl border p-4 flex items-center justify-between transition-all duration-300",
                      selectedLanguage === "en"
                        ? "border-green-500 bg-green-50/10 dark:bg-green-950/15 shadow-sm ring-1 ring-green-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl filter drop-shadow-sm">🇺🇸</span>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">English</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">United States</p>
                      </div>
                    </div>
                    {selectedLanguage === "en" && (
                      <div className="h-5 w-5 bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Indonesian Option */}
                  <div
                    onClick={() => setSelectedLanguage("id")}
                    className={cn(
                      "flex-1 cursor-pointer rounded-2xl border p-4 flex items-center justify-between transition-all duration-300",
                      selectedLanguage === "id"
                        ? "border-green-500 bg-green-50/10 dark:bg-green-950/15 shadow-sm ring-1 ring-green-500/30"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl filter drop-shadow-sm">🇮🇩</span>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Bahasa Indonesia</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Indonesia</p>
                      </div>
                    </div>
                    {selectedLanguage === "id" && (
                      <div className="h-5 w-5 bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="px-5 rounded-xl text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-sm"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </span>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>

            </form>
          )}
        </div>
      </div>
    </>
  );
}
