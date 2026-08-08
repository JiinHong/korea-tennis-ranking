"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackAmplitudePageView } from "@/lib/analytics/amplitude";

export default function AmplitudeAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    void trackAmplitudePageView(pathname).catch(() => undefined);
  }, [pathname]);

  return null;
}
