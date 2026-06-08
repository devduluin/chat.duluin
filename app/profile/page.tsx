// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccountStore } from "@/store/useAccountStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getUserById, updateUserProfile } from "@/services/chatUserService";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { ArrowLeft, User, Mail, Phone, Shield, Building, Globe, Camera, BadgeCheck } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: accountData, setData: setAccountData } = useAccountStore();
  const userId = typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");

  const avatarSeeds = ["Felix", "Aneka", "Jack", "Boo", "Garfield", "Bella", "Cookie", "Spooky"];

  useEffect(() => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    async function fetchUserData() {
      try {
        const response = await getUserById(userId);
        if (response && response.status) {
          const user = response.data;
          setFirstName(user.first_name || "");
          setLastName(user.last_name || "");
          setAvatarUrl(user.avatar_url || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
          setUserType(user.user_type || "human");
          // setTenantId(user.tenant_id || "");
          setTenantName(user.tenant?.name || "");

          setAccountData({
            ...accountData,
            ...user,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
          });
        } else {
          toast.error("Failed to load profile");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile details");
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [userId, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await updateUserProfile(userId, firstName.trim(), lastName.trim(), avatarUrl.trim());
      if (response && response.status) {
        const updatedUser = response.data;
        const newName = `${updatedUser.first_name} ${updatedUser.last_name}`.trim();

        setAccountData({
          ...accountData,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          name: newName,
          avatar_url: updatedUser.avatar_url,
        });

        useAuthStore.setState({ name: newName });
        toast.success("Profile updated successfully");
      } else {
        toast.error(response?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("An error occurred while updating profile");
    } finally {
      setSaving(false);
    }
  };

  const selectAvatarPreset = (seed: string) => {
    const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    setAvatarUrl(dicebearUrl);
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
              <User className="h-5 w-5 text-green-500 flex-shrink-0" />
              Edit Profile
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Customize your profile details and settings
            </p>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-5 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-10 w-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading your profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">

              {/* Profile Header Banner Block */}
              <div className="relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 shadow-md overflow-hidden">
                {/* Banner gradient */}
                <div className="h-24 sm:h-32 md:h-40 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 relative">
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
                </div>

                {/* Avatar + Info + Save button */}
                <div className="px-5 pb-5 pt-14 sm:pt-16 md:pt-6 relative">
                  {/* Avatar — absolute on sm+, relative on mobile */}
                  <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 md:left-8">
                    <div className="relative p-1.5 bg-white dark:bg-gray-900 rounded-full shadow-lg">
                      <Avatar
                        src={avatarUrl}
                        name={`${firstName} ${lastName}`}
                        className="w-20 h-20 sm:w-24 sm:h-24 text-2xl border-2 border-gray-100 dark:border-gray-800"
                      />
                    </div>
                  </div>

                  {/* Name + type + save button row */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:pl-28 md:pl-32">
                    <div className="text-center sm:text-left">
                      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                        {firstName || "User"} {lastName}
                        <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500/10" />
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                        {userType} Account
                      </p>
                    </div>

                    {/* Save button — visible on sm+ inside the card */}
                    <div className="hidden sm:block flex-shrink-0">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm px-5 py-2 text-sm transition-all hover:scale-[1.02] active:scale-95"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Avatar Presets card */}
                <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                      <Camera className="w-4 h-4 text-green-500" /> Presets
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Pick a premium illustration seed
                    </p>

                    <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
                      {avatarSeeds.map((seed) => (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => selectAvatarPreset(seed)}
                          className="p-1 rounded-xl border border-gray-200 dark:border-gray-800/80 hover:border-green-500 hover:bg-green-50/20 dark:hover:bg-green-950/10 transition-all hover:scale-105 active:scale-95"
                          title={seed}
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                            alt={seed}
                            className="w-full h-8 rounded-lg"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-gray-950/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-900">
                    Choosing a preset updates your avatar instantly.
                  </div>
                </div>

                {/* Form fields card */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                      <User className="w-4 h-4 text-green-500" /> Personal Info
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Change your first name, last name, and profile image URL
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="bg-gray-50/50 dark:bg-gray-950/50 rounded-xl border-gray-200 dark:border-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="bg-gray-50/50 dark:bg-gray-950/50 rounded-xl border-gray-200 dark:border-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                    />
                  </div>

                  {/* <div className="space-y-1.5">
                    <Label htmlFor="avatarUrl" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Avatar Image URL
                    </Label>
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="bg-gray-50/50 dark:bg-gray-950/50 rounded-xl border-gray-200 dark:border-gray-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-mono text-xs"
                    />
                  </div> */}
                </div>
              </div>

              {/* Readonly Info Section */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                    <Shield className="w-4 h-4 text-gray-500" /> HRIS Credentials (Read-only)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    System identifiers loaded from your corporate account profile
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-950/80 rounded-2xl border border-gray-150 dark:border-gray-900">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-500 flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm truncate" title={email}>{email || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-950/80 rounded-2xl border border-gray-150 dark:border-gray-900">
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-500 flex-shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone Number</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm truncate">{phone || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-950/80 rounded-2xl border border-gray-150 dark:border-gray-900">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-500 flex-shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Account Type</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm capitalize">{userType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-950/80 rounded-2xl border border-gray-150 dark:border-gray-900">
                    <div className="p-2 bg-teal-50 dark:bg-teal-950/50 rounded-xl text-teal-500 flex-shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tenant Identity</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm truncate" title={tenantId}>
                        {tenantName || tenantId || "-"}
                      </p>
                      {tenantName && (
                        <p className="font-mono text-[10px] text-gray-400 truncate" title={tenantId}>{tenantId}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Action Buttons — shown on all sizes < sm */}
              <div className="flex items-center justify-between gap-3 pt-1 sm:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="px-5 py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm shadow-sm"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>

            </form>
          )}
        </div>
      </div>
    </>
  );
}
