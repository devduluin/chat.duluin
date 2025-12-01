"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2, Key, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { useAppCookies } from '@/hooks/useAppCookies';
import { validationToken, getUserInfo, connectAccount } from '@/services/loginService';

export default function ConnectAccountPage() {
  const { appToken } = useAppCookies();
  const [loading, setLoading] = useState(false);
  const [ user, setUser ] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect");
  const [hasMounted, setHasMounted] = useState(false);

  const app = {
    name: "Duluin Forms",
    description: "Next-gen form management platform",
    logoUrl: "/icons/logo-forms.png",
    permissions: [
      "View your basic profile info",
      "Access your form data",
      "Manage workspace settings",
    ],
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

    // 🚀 Immediately redirect if no appToken
  useEffect(() => {
    if (hasMounted && appToken === null) {
      router.replace("/");
    }
  }, [hasMounted, appToken, router]);

  useEffect(() => {
      const validate = async () => {
        if (!appToken) {
          router.replace("/");
          return;
        }
  
        try {
          setLoading(true);
          const validate = await validationToken(appToken);

          if (validate?.success) {
            router.push(redirect || "/");
            return;
          }else if (validate.status === 401) {
            router.push("/auth/signin");
          }

          const result = await getUserInfo(appToken);
  
          if (result?.success) {
              const user = result.user ?? {};
              setUser(user);
          }
        } catch (error: any) {
        } finally {
          setLoading(false);
        }
      };
  
      // 🚀 Only call validate if no data or no companyId
      if (appToken) {
        validate();
      }
    }, [appToken]);

     // Handle Allow Access
    const handleAllowAccess = async () => {
          if (!user.email || !appToken) return;
        try {
        setSubmitting(true);
        const result = await connectAccount({ appToken: appToken, email: user.email });
        if(result?.success){
          router.push(redirect || "/");
        }
        } catch (error) {
        console.error("Error connecting account:", error);
        // Optional: show toast or error message
        } finally {
        setSubmitting(false);
        }
    };

    // Handle Cancel
    const handleCancel = () => {
        localStorage.setItem("hasRedirected", "true");
        router.push("/");
    };

    if (loading) return null;

  return (
    <div className="flex w-full mx-auto mt-20 items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative rounded-2xl shadow-xl overflow-hidden border-0">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-400 to-violet-600" />
          <div className="absolute -left-10 -bottom-17 w-28 h-28 rounded-full bg-indigo-100/50" />

          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-200/50">
            {/* Left Column - SSO Info */}
            <div className="p-8 flex flex-col justify-between bg-gradient-to-b from-gray-50 to-gray-100">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100/80 rounded-lg backdrop-blur-sm">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Duluin SSO Authentication</h1>
                    <p className="text-sm text-gray-500">
                      Signed in via enterprise identity provider
                    </p>
                  </div>
                </div>

                {/* User Card */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12 border-2 border-white shadow">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-100 to-purple-100">
                        {user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Security Status */}
                <div className="p-3 bg-blue-50/50 backdrop-blur-sm rounded-lg border border-blue-100 flex items-start text-sm text-blue-700">
                  <Cpu className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <p>
                    <span className="font-medium">Zero-trust security:</span> Your credentials never leave your organization's network.
                  </p>
                </div>
                 
              </div>

              {/* Security Badge */}
              <div className="mt-6 flex items-center text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 mr-2 text-blue-400 flex-shrink-0" />
                <span>End-to-end encrypted connection • ISO 27001 certified</span>
              </div>
            </div>

            {/* Right Column - App Info */}
            <div className="p-8 flex flex-col justify-between bg-white">
              <div className="space-y-6">
                
                {/* App Card */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/50 flex items-center">
                  <Avatar className="h-12 w-12 border-2 border-white shadow">
                    <AvatarImage src={app.logoUrl} alt={app.name} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-100 to-blue-100">
                      {app.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-2">
                    <p className="text-lg font-semibold">{app.name}</p>
                    <p className="text-xs text-gray-500">{app.description}</p>
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-4">
                  <h2 className="text-sm font-medium text-gray-700">
                    Requested permissions:
                  </h2>
                  <ul className="space-y-3">
                    {app.permissions.map((perm, i) => (
                      <motion.li 
                        key={i} 
                        className="flex items-start"
                        whileHover={{ x: 2 }}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm">{perm}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 mt-8">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md"
                    disabled={submitting}
                    onClick={handleAllowAccess}
                  >
                    {submitting ? "Connecting..." : "Allow Access"}
                  </Button>
                </motion.div>
                <Button
                    variant="outline"
                    className="w-full transition-colors duration-200"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <div className="flex justify-between text-xs text-gray-400 mt-4">
                  <div>
                    <a href="#" className="hover:underline">
                      Privacy Policy
                    </a>{" "}
                    ·{" "}
                    <a href="#" className="hover:underline">
                      Terms of Service
                    </a>
                  </div>
                  <div className="text-right">
                    v1.4.1 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}