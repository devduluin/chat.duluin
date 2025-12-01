"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAppCookies } from '@/hooks/useAppCookies';
import { useRouter } from "next/navigation";
import { useAccountStore } from '@/store/useAccountStore';
import { validateEmailAccount, validationToken, loginService } from '@/services/loginService';
import { showError, showSuccess } from '@utils/alertHelper';
import { Avatar } from "@/components/ui/avatar";
import { useLoginStore } from '@/store/useLoginStore';

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
        // Set user data immediately if available
        if (result.result.user) {
          Router.push("/forms");
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
          const role = result.user.roles?.[0]?.name ?? 'pro'; // fallback if roles missing
          setData({
            companyId: user.secondary_id ?? user.id,
            accountType: role === 'Basic' ? 'Basic' : 'pro',
            formQuota: role === 'Basic' ? 4 : 5,
            ...user,
          });
          showSuccess(`Welcome back, ${user?.name || 'User'}!`);
          Router.push(`/forms`);
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
        showError('Session expired or invalid token!');
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full mx-auto mt-20 items-center justify-center p-4"
    >
      <Card className="relative w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 bg-white p-8 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-rose-400" />
        <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-amber-100/50" />
        <div className="absolute -left-10 -bottom-10 w-28 h-28 rounded-full bg-rose-100/50" />
        <div className="absolute -left-10 -bottom-20 w-28 h-28 rounded-full bg-indigo-100/50" />
        
        {/* Back Button at the top */}
        {step === "password" && (
          <button
            type="button"
            onClick={handleBack}
            className="absolute top-5 left-4 flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-800 shadow-md flex items-center justify-center hover:ring-2 hover:ring-violet-500 transition">
                <LayoutDashboard className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">
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
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2 mb-6">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 py-3"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow cursor-pointer"
                disabled={!validateEmail(email) || isLoadingEmail}
              >
                {isLoadingEmail ? "Check in..." : "Continue"}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  {/* <span className="bg-white px-2 text-gray-500">
                    Or continue with
                  </span> */}
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="gap-2" onClick={handleGoogleLogin}>
                  <span className="inline-flex items-center justify-center w-6 h-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-6 h-6"
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
                  </span>
                  Google
                </Button>
{/* 
                <Button variant="outline" className="gap-2">
                  <svg
                    className="w-6 h-6"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12a10 10 0 0 1-10 10A10 10 0 0 1 2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 10 10Zm-10-3a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3c1.3 0 2.4-.8 2.8-2H12a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h2.8c-.4-1.2-1.5-2-2.8-2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Microsoft
                </Button> */}
              </div>

            </form>
          )}

          {/* Password Step */}
          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-6">
              {/* User Card */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm"
                >
                  <div className="">
                    <Card onClick={handleBack} className="flex text-left space-x-4 cursor-pointer">
                    <Avatar className="h-10 w-10 border-2 border-white shadow">
                       
                    </Avatar>
                    <div className="pl-0">
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-gray-500 font-mono">{email}</p>
                    </div>
                    </Card>
                  </div>
                </motion.div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="py-3"
                  />
                </div>
                <div className="text-right">
                  <a
                    href="#forgot-password"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-6 mb-5">
          Don't have an account?{" "}
          <a href="#signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </div>
      </Card>
    </motion.div>
  );
}
