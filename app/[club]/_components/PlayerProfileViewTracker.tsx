"use client";

import { useEffect, useRef } from "react";

import { trackAmplitudeEvent } from "@/lib/analytics/amplitude";

export default function PlayerProfileViewTracker({
  clubSlug,
  rank,
}: {
  clubSlug: string;
  rank: number;
}) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) {
      return;
    }

    trackedRef.current = true;
    void trackAmplitudeEvent("Player Profile Viewed", {
      club_slug: clubSlug,
      rank,
    });
  }, [clubSlug, rank]);

  return null;
}
