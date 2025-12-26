import React from "react";
import LogoutHandler from "@/components/auth/LogoutHandler";

export const metadata = {
  title: "Logging out - Duluin Chat",
  description: "Logging out of your account",
};

export default function LogoutPage() {
  return <LogoutHandler />;
}
