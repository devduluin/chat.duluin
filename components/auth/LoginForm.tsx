"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAppCookies } from "@/hooks/useAppCookies";
import { useRouter } from "next/navigation";
import { useAccountStore } from "@/store/useAccountStore";
import {
  validateEmailAccount,
  validationToken,
  loginService,
} from "@/services/loginService";
import { syncUserToChatBackend } from "@/services/chatUserService";
import { showError, showSuccess } from "@utils/alertHelper";
import { Avatar } from "@/components/ui/avatar";
import { useLoginStore } from "@/store/useLoginStore";
import { useContactSync } from "@/hooks/useContactSync";
import Cookies from "js-cookie";

export function LoginForm() {
  const [name, setName] = useState("");
  // const [email, setEmail] = useState("");
  const { email, setEmail } = useLoginStore();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");

  const { appToken, setAppToken } = useAppCookies();
  const { data, setData, clearData } = useAccountStore();
  const [isValidating, setIsValidating] = useState(true);
  const Router = useRouter();
  const { syncContactsFromHRIS } = useContactSync();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = re.test(email);
    return valid;
  };

  const submitEmail = async (emailToSubmit: string) => {
    if (emailToSubmit && validateEmail(emailToSubmit)) {
      setIsLoadingEmail(true);
      try {
        const result = await validateEmailAccount(emailToSubmit);
        if (result?.success) {
          setName(result.data?.name);
          setStep("password");
        } else {
          showError("Your email is not registered!");
          setEmail("");
        }
      } catch (error) {
        showError("Login failed!");
      } finally {
        setIsLoadingEmail(false);
      }
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEmail(email);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await loginService(email, password);
      if (result?.result) {
        setAppToken(result.result?.token);

        // Sync user to chat backend
        const syncData = {
          id: result.result?.id,
          secondary_id: result.result?.secondary_id,
          email: email,
          name: result.result?.name,
          phone: "", // Will be updated when we get full user data
        };

        // Store user info in cookies FIRST before any sync
        Cookies.set("user_id", result.result?.id);
        Cookies.set("tenant_id", result.result?.secondary_id);

        console.log("✅ Cookies set:", {
          user_id: result.result?.id,
          tenant_id: result.result?.secondary_id,
          token: result.result?.token ? "Available" : "Missing",
        });

        // Sync user asynchronously (don't block login flow)
        syncUserToChatBackend(syncData).catch((error) => {
          console.error("Failed to sync user to chat backend:", error);
        });

        // Sync contacts from HRIS asynchronously (non-blocking)
        // Pass token directly to avoid timing issues
        syncContactsFromHRIS(result.result?.token)
          .then((syncResult) => {
            if (syncResult?.success) {
              console.log(
                `✅ Contacts synced: ${syncResult.syncedUsers} users, ${syncResult.createdContacts} contacts`
              );
            } else {
              console.warn("⚠️ Contact sync failed:", syncResult?.message);
            }
          })
          .catch((error) => {
            console.error("❌ Failed to sync contacts from HRIS:", error);
          });

        // Set user data immediately if available
        if (result.result.user) {
          Router.push("/");
        }
        // Redirect immediately without timeout
        setIsLoading(false);
      } else {
        showError(result?.message);
        setIsLoading(false);
      }
    } catch (error) {
      showError("Login failed!");
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
  };

  useEffect(() => {
    const validate = async () => {
      if (!appToken) {
        clearData();
        setIsValidating(false);
        return;
      }

      try {
        const result = await validationToken(appToken);

        if (result?.success) {
          const user = result.user ?? {};
          const role = result.user.roles?.[0]?.name ?? "pro"; // fallback if roles missing
          setData({
            companyId: user.secondary_id ?? user.id,
            accountType: role === "Basic" ? "Basic" : "pro",
            formQuota: role === "Basic" ? 4 : 5,
            ...user,
          });

          // Sync user to chat backend on session validation
          const syncData = {
            id: user.id,
            secondary_id: user.secondary_id ?? user.id,
            email: user.email,
            name: user.name,
            phone: user.phone || "",
          };

          syncUserToChatBackend(syncData).catch((error) => {
            console.error("Failed to sync user to chat backend:", error);
          });

          // Store user info in cookies for contact sync
          Cookies.set("user_id", user.id);
          Cookies.set("tenant_id", user.secondary_id ?? user.id);

          // Sync contacts from HRIS asynchronously (non-blocking)
          // Pass appToken for session validation flow
          syncContactsFromHRIS(appToken)
            .then((syncResult) => {
              if (syncResult?.success) {
                console.log(
                  `✅ Contacts synced: ${syncResult.syncedUsers} users, ${syncResult.createdContacts} contacts`
                );
              } else {
                console.warn("⚠️ Contact sync failed:", syncResult?.message);
              }
            })
            .catch((error) => {
              console.error("❌ Failed to sync contacts from HRIS:", error);
            });

          showSuccess(`Welcome back, ${user?.name || "User"}!`);
          Router.push(`/`);
        } else if (result.status === 301) {
          clearData();
          if (
            result?.data?.allowed_register === true &&
            typeof window !== "undefined"
          ) {
            Router.push(`/auth/connect`);
          }
        }
      } catch (error: any) {
        showError("Session expired or invalid token!");
      } finally {
        setIsValidating(false);
      }
    };

    if (appToken) {
      validate();
    } else {
      setIsValidating(false);
    }
  }, [appToken, clearData, setData, Router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hasRedirected");
    }
  }, []);

  useEffect(() => {
    if (data) {
      Router.push("/");
    }
  }, [data]);

  const handleGoogleLogin = () => {
    Router.push("/auth/google");
  };

  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Duluin Workspace
          </span>
        </div>
        <span className="text-xs text-gray-500 ml-8">
          Everything you need tools
        </span>
      </div>

      {/* Centered Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Card with gradient top border */}
          <Card className="relative overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
            {/* Gradient top border */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />

            <div className="p-8 space-y-6">
              {/* Logo centered */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Back Button */}
              {step === "password" && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
              )}

              {/* Header */}
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {step === "email" ? "Sign In" : "Enter Password"}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === "email"
                    ? "Enter your email to continue"
                    : `Continue with ${email}`}
                </p>
              </div>

              {/* Email Step */}
              {step === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    disabled={!validateEmail(email) || isLoadingEmail}
                  >
                    {isLoadingEmail ? "Checking..." : "Continue"}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                  </div>

                  {/* Social Login */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-2 border-gray-300 hover:bg-gray-50 rounded-md"
                    onClick={handleGoogleLogin}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-5 h-5"
                    >
                      <path
                        fill="#4285f4"
                        d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.6 2.1 29.6 0 24 0 14.5 0 6.4 5.7 2.6 13.9l7 5.5C11.6 13 17.2 9.5 24 9.5z"
                      />
                      <path
                        fill="#34a853"
                        d="M46.1 24.6c0-1.6-.1-2.7-.3-3.9H24v7.4h12.6c-.6 3.2-2.4 5.9-5 7.6l7 5.4c4.2-3.9 6.5-9.6 6.5-16.5z"
                      />
                      <path
                        fill="#fbbc05"
                        d="M10.2 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7-5.4C2.4 17 1.3 20.4 1.3 24s1.1 7 2.9 10l7-5.4z"
                      />
                      <path
                        fill="#ea4335"
                        d="M24 46c6.5 0 12-2.1 16-5.7l-7-5.4c-2 1.3-4.7 2.1-9 2.1-6.8 0-12.4-4.6-14.5-10.8l-7 5.4C6.4 42.3 14.5 46 24 46z"
                      />
                    </svg>
                    Google
                  </Button>
                </form>
              )}

              {/* Password Step */}
              {step === "password" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  {/* User Card */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Avatar className="h-12 w-12 bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                      {name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-sm text-gray-600">{email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="text-right">
                      <a
                        href="#forgot-password"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 pt-4">
                Don't have an account?{" "}
                <a
                  href="/auth/signup"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign up
                </a>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
