"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function RankingMethodologyInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeWhenPressingOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const closeWhenPressingEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeWhenPressingOutside);
    document.addEventListener("keydown", closeWhenPressingEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenPressingOutside);
      document.removeEventListener("keydown", closeWhenPressingEscape);
    };
  }, [isOpen]);

  return (
    <div
      className="ranking-methodology-info"
      data-open={isOpen ? "true" : "false"}
      ref={containerRef}
    >
      <button
        aria-controls="ranking-methodology-tooltip"
        aria-describedby="ranking-methodology-tooltip"
        aria-expanded={isOpen}
        aria-label="랭킹 산정 방식 안내"
        className="ranking-methodology-trigger"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <Info aria-hidden="true" />
      </button>

      <div
        className="ranking-methodology-tooltip"
        data-open={isOpen ? "true" : "false"}
        data-testid="ranking-methodology-tooltip"
        id="ranking-methodology-tooltip"
      >
        <p>
          대회 성적에 진출 단계, 대회 위상, 참가 규모, 최근 연도 가중치를
          적용합니다.
        </p>
        <p>같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.</p>
        <p>
          WEMIX OPEN 2025는 전체 대진 검증 전이라 현재 점수에서 제외합니다.
        </p>
        <Link href="/methodology">자세히 보기</Link>
      </div>
    </div>
  );
}
