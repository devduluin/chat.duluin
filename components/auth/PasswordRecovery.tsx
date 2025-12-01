"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginService } from "@services/loginService"; 
import { loginValidator } from "@/validator/authValidator";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setApiError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const validationErrors = loginValidator(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const data = await loginService(email, password);
      document.cookie = `authToken=${data.token}; path=/;`;

      router.push("/dashboard");
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Server error. Please try again.";
      setApiError(errorMessage);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <Input
        id="email"
        type="text"
        name="email"
        value=""
        placeholder="Email"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full text-white py-3 rounded-lg font-semibold transition 
        bg-[#F55B44] hover:bg-[#e34f3a] cursor-pointer 
        disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? "Sending email..." : "Lupa Password"}
      </button>
    </form>
  );
}
