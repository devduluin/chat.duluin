"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { signupValidator } from "@/validator/authValidator";
import Link from "next/link";

export default function SignupForm() {
  const [form, setForm] = useState({
    idCard: "",
    company: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setApiError("");
    setErrors({});

    const { email, password, confirmPassword, idCard, company, phone, agree } = form;
 
    // Validate signup
    const validationErrors = signupValidator(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    const formData = {
        idCard: idCard,
        company: company,
        phone: phone,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
    };

    try {
      console.log(formData);
      
      // await signupService(form); // Replace with your actual API
      //router.push("/dashboard");
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Terjadi kesalahan server.");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      

      <div className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          id="agree"
          name="agree"
          checked={form.agree}
          onChange={(e) => setForm((prev) => ({ ...prev, agree: e.target.checked }))}
          className=" h-6 w-6 rounded border-teal-300 text-teal-600 focus:ring-teal-500
            transition-colors duration-200 ease-in-out
            cursor-pointer hover:border-teal-400"
        />
        <label htmlFor="agree">
          Saya telah membaca dan menyetujui{" "}
          <Link href="/page/term-and-conditions" className="text-teal-700 font-semibold">Syarat dan Ketentuan Pengguna</Link>{" "}
          serta{" "}
          <Link href="/page/privacy-policy" className="text-teal-700 font-semibold">Kebijakan Privasi</Link>
        </label>
      </div>
      {errors.agree && <p className="text-red-500 text-sm">{errors.agree}</p>}

      {apiError && <p className="text-red-600">{apiError}</p>}

      <button
        type="submit"
        disabled={loading || !form.agree}
        className="w-full text-white py-3 rounded-lg font-semibold transition 
        bg-[#F55B44] hover:bg-[#e34f3a] cursor-pointer 
        disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
      >
        {loading ? "Mendaftarkan..." : "Daftar"}
      </button>
    </form>
  );
}
