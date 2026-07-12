"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type MethodologyTableRegionProps = Readonly<{
  label: string;
  children: ReactNode;
}>;

export default function MethodologyTableRegion({
  label,
  children,
}: MethodologyTableRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const region = regionRef.current;

    if (!region) {
      return;
    }

    const measureOverflow = () => {
      setIsScrollable(region.scrollWidth > region.clientWidth + 1);
    };

    measureOverflow();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOverflow);
      return () => window.removeEventListener("resize", measureOverflow);
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-label={`${label} 스크롤 영역`}
      className="methodology-table-scroll"
      ref={regionRef}
      role="region"
      tabIndex={isScrollable ? 0 : undefined}
    >
      {children}
    </div>
  );
}
