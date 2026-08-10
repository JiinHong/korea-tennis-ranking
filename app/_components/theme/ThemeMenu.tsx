"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function ThemeMenu() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const isDark = mounted && resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = `${nextTheme === "light" ? "라이트" : "다크"} 테마로 전환`;

  return (
    <div className="theme-menu">
      <button
        type="button"
        className="theme-toggle"
        aria-label={label}
        aria-pressed={isDark}
        title={label}
        onClick={() => setTheme(nextTheme)}
      >
        <Sun
          className="theme-toggle-icon is-sun"
          aria-hidden="true"
          size={16}
          strokeWidth={1.9}
        />
        <Moon
          className="theme-toggle-icon is-moon"
          aria-hidden="true"
          size={16}
          strokeWidth={1.9}
        />
        <span className="theme-toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
