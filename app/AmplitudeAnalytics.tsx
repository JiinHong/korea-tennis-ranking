"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { syncAmplitudeRoute } from "@/lib/amplitudeAnalytics";

export default function AmplitudeAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    void syncAmplitudeRoute(pathname).catch(() => undefined);
  }, [pathname]);

  return null;
}
