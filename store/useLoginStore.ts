import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LoginState {
  email: string;
  setEmail: (email: string) => void;
  clearEmail: () => void;
}

export const useLoginStore = create<LoginState>()(
  persist(
    (set) => ({
      email: "",
      setEmail: (email) => set({ email }),
      clearEmail: () => set({ email: "" }),
    }),
    {
      name: "login-store", // Key in localStorage
    }
  )
);
