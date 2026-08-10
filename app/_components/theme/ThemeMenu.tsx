"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const THEME_OPTIONS = [
  { value: "system", label: "시스템 테마", shortLabel: "자동", Icon: Monitor },
  { value: "light", label: "라이트 테마", shortLabel: "라이트", Icon: Sun },
  { value: "dark", label: "다크 테마", shortLabel: "다크", Icon: Moon },
] as const;

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  return (
    <div className="theme-menu" aria-label="화면 테마">
      <span className="theme-menu-label">화면 테마</span>
      <div className="theme-menu-options">
        {THEME_OPTIONS.map(({ value, label, shortLabel, Icon }) => {
          const isSelected = mounted && theme === value;

          return (
            <button
              key={value}
              type="button"
              className="theme-menu-option"
              aria-label={label}
              aria-pressed={isSelected}
              title={label}
              onClick={() => setTheme(value)}
            >
              <Icon aria-hidden="true" size={15} strokeWidth={1.9} />
              <span>{shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
