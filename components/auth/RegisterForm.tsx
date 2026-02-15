"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { showError, showSuccess } from "@utils/alertHelper";
import {
  validateEmailAccount,
  registerChatWorkspace,
  validationToken,
} from "@/services/loginService";
import { Avatar } from "@/components/ui/avatar";
import { useAppCookies } from "@/hooks/useAppCookies";
import Cookies from "js-cookie";
import { syncUserToChatBackend } from "@/services/chatUserService";
import { useContactSync } from "@/hooks/useContactSync";
import { useAccountStore } from "@/store/useAccountStore";

export function RegisterForm() {
  const [step, setStep] = useState<"email" | "details" | "workin-password">(
    "email",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [workinPassword, setWorkinPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkinPassword, setShowWorkinPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    name: string;
    email: string;
    hasAccount: boolean;
  } | null>(null);

  const Router = useRouter();
  const { setAppToken } = useAppCookies();
  const { syncContactsFromHRIS } = useContactSync();
  const { clearData, setData } = useAccountStore();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && validateEmail(email)) {
      setIsLoadingEmail(true);
      setExistingUser(null);

      try {
        const result = await validateEmailAccount(email);

        if (result?.success && result?.data) {
          // User exists in the system
          const hasAccount = result?.data?.has_account || false;

          setExistingUser({
            name: result.data.name,
            email: result.data.email,
            hasAccount: hasAccount,
          });

          // If user already has chat_workspace account, show message
          if (hasAccount) {
            showError("This email is already registered. Please sign in.");
          }
        } else {
          // User doesn't exist, proceed to registration
          setStep("details");
        }
      } catch (error) {
        // If user validation fails (user not found), that's good for signup
        setStep("details");
      } finally {
        setIsLoadingEmail(false);
      }
    }
  };

  const handleWorkinSSORegister = () => {
    if (existingUser?.hasAccount) {
      // User already has chat_workspace, redirect to signin
      Router.push("/auth/signin");
    } else {
      // User needs to enter Workin password
      setStep("workin-password");
    }
  };

  const handleWorkinPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workinPassword || workinPassword.length < 8) {
      showError("Please enter your Workin password (minimum 8 characters)");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerChatWorkspace(email, workinPassword);

      console.log("🔍 Register chat result:", result);

      // Backend returns { message, result, errors } structure
      // Check if result exists and errors is null
      if (result?.result && !result?.errors) {
        console.log("✅ Registration successful, starting sync...");

        // Clear ALL old data before setting new credentials
        clearData(); // Clear localStorage

        // Clear all cookies to prevent session conflict
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(
              /=.*/,
              "=;expires=" + new Date().toUTCString() + ";path=/",
            );
        });

        console.log("🧹 Cleared all old data and cookies");

        // Now set new token
        setAppToken(result.result.token);

        // Store user info in cookies
        Cookies.set("user_id", result.result.id);
        Cookies.set("tenant_id", result.result.secondary_id);

        console.log("✅ Token and cookies set:", {
          user_id: result.result.id,
          tenant_id: result.result.secondary_id,
          token: result.result.token ? "Available" : "Missing",
        });

        // Fetch full user data from validation endpoint to populate accountStore
        try {
          const validationResult = await validationToken(result.result.token);

          console.log("🔍 Validation result:", validationResult);

          if (validationResult?.success && validationResult?.user) {
            const user = validationResult.user;
            const role = user.roles?.[0]?.name ?? "pro";

            // Set user data to accountStore (same as login flow)
            setData({
              companyId: user.secondary_id ?? user.id,
              accountType: role === "Basic" ? "Basic" : "pro",
              formQuota: role === "Basic" ? 4 : 5,
              ...user,
            });

            console.log("✅ User data set to accountStore:", {
              id: user.id,
              name: user.name,
              email: user.email,
              secondary_id: user.secondary_id,
            });
          }
        } catch (validationError) {
          console.error("⚠️ Failed to fetch user data:", validationError);
          // Continue anyway with data from registration response
        }

        // Sync user to chat backend
        const syncData = {
          id: result.result.id,
          secondary_id: result.result.secondary_id,
          email: email,
          name: result.result.name,
          phone: "", // Will be updated when we get full user data
        };

        // Sync user asynchronously (don't block registration flow)
        syncUserToChatBackend(syncData)
          .then(() => {
            console.log("✅ User synced to chat backend");
          })
          .catch((error) => {
            console.error("❌ Failed to sync user to chat backend:", error);
          });

        // Sync contacts from HRIS asynchronously (non-blocking)
        // Pass token directly to avoid timing issues
        syncContactsFromHRIS(result.result.token)
          .then((syncResult) => {
            if (syncResult?.success) {
              console.log(
                `✅ Contacts synced: ${(syncResult as any).syncedUsers || 0} users, ${(syncResult as any).createdContacts || 0} contacts`,
              );
            } else {
              console.warn("⚠️ Contact sync failed:", syncResult?.message);
            }
          })
          .catch((error) => {
            console.error("❌ Failed to sync contacts from HRIS:", error);
          });

        showSuccess("Chat workspace account registered successfully!");

        console.log("🚀 Redirecting to dashboard...");
        // Use Router.push like login flow
        Router.push("/");
      } else {
        console.error("❌ Registration failed:", result);
        showError(
          result?.message || "Registration failed. Please check your password.",
        );
      }
    } catch (error) {
      console.error("❌ Exception during registration:", error);
      showError("Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError("Passwords do not match!");
      return;
    }

    if (password.length < 8) {
      showError("Password must be at least 8 characters long!");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement your registration API call here
      // const result = await registerService(name, email, password);

      // Simulate API call
      setTimeout(() => {
        showSuccess("Account created successfully!");
        Router.push("/auth/signin");
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      showError("Registration failed!");
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // TODO: Implement Google OAuth
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
              {(step === "details" || step === "workin-password") && (
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
                  {step === "email"
                    ? "Sign Up"
                    : step === "workin-password"
                      ? "Register with Workin SSO"
                      : "Create Your Account"}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === "email"
                    ? "Enter your email to get started"
                    : step === "workin-password"
                      ? "Enter your Workin password to complete registration"
                      : `Complete your profile for ${email}`}
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
                      <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setExistingUser(null);
                        }}
                        className="h-11 pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Existing User Info */}
                  {existingUser && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`${
                        existingUser.hasAccount
                          ? "bg-amber-50 border-amber-200"
                          : "bg-blue-50 border-blue-200"
                      } border rounded-lg p-4`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar
                          name={existingUser.name}
                          size="md"
                          className="h-10 w-10"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {existingUser.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {existingUser.email}
                          </p>
                        </div>
                      </div>
                      {existingUser.hasAccount && (
                        <p className="text-sm text-amber-700 mt-2">
                          This account is already registered. Please sign in.
                        </p>
                      )}
                      {!existingUser.hasAccount && (
                        <p className="text-sm text-blue-700 mt-2">
                          You can register using your Workin account.
                        </p>
                      )}
                    </motion.div>
                  )}

                  <Button
                    type={existingUser ? "button" : "submit"}
                    size="lg"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    disabled={!validateEmail(email) || isLoadingEmail}
                    onClick={existingUser ? handleWorkinSSORegister : undefined}
                  >
                    {isLoadingEmail
                      ? "Checking..."
                      : existingUser
                        ? existingUser.hasAccount
                          ? "Sign In"
                          : "Register with Workin SSO"
                        : "Continue"}
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
                    onClick={handleGoogleSignUp}
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

              {/* Workin Password Step */}
              {step === "workin-password" && existingUser && (
                <form
                  onSubmit={handleWorkinPasswordSubmit}
                  className="space-y-5"
                >
                  {/* User Info Card */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={existingUser.name}
                        size="md"
                        className="h-10 w-10"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {existingUser.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {existingUser.email}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="workinPassword"
                      className="text-sm font-medium text-gray-700"
                    >
                      Workin Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="workinPassword"
                        type={showWorkinPassword ? "text" : "password"}
                        placeholder="Enter your Workin password"
                        value={workinPassword}
                        onChange={(e) => setWorkinPassword(e.target.value)}
                        required
                        className="h-11 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() =>
                          setShowWorkinPassword(!showWorkinPassword)
                        }
                      >
                        {showWorkinPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Use your existing Workin account password
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    disabled={isLoading || !workinPassword}
                  >
                    {isLoading ? "Registering..." : "Complete Registration"}
                  </Button>
                </form>
              )}

              {/* Details Step */}
              {step === "details" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
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
                        placeholder="At least 8 characters"
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
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-700"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-11 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 pt-4">
                Already have an account?{" "}
                <a
                  href="/auth/signin"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </a>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
