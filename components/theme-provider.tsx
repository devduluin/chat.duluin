"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

function ThemeSync() {
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    try {
      const { useAccountStore } = require("@/store/useAccountStore");
      const accountData = useAccountStore.getState().data;
      const userTheme = accountData?.settings?.theme;
      if (userTheme && userTheme !== theme) {
        setTheme(userTheme);
      }
    } catch (err) {
      console.error("ThemeSync error:", err);
    }
  }, [theme, setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
