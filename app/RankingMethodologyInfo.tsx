"use client";

import { Info, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function RankingMethodologyInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const detailLinkRef = useRef<HTMLAnchorElement>(null);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = [
        closeButtonRef.current,
        detailLinkRef.current,
      ].filter(
        (element): element is HTMLButtonElement | HTMLAnchorElement =>
          element !== null
      );
      const currentIndex = focusableElements.findIndex(
        (element) => element === document.activeElement
      );
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1;

      event.preventDefault();
      focusableElements[nextIndex]?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [closeDialog, isOpen]);

  return (
    <div className="ranking-methodology-info">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="랭킹 산정 방식 보기"
        className="ranking-methodology-trigger"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        title="랭킹 산정 방식 보기"
        type="button"
      >
        <Info aria-hidden="true" />
      </button>

      {isOpen ? (
        <>
          <div
            className="ranking-methodology-backdrop"
            data-testid="ranking-methodology-backdrop"
            onClick={closeDialog}
          />
          <div
            aria-labelledby="ranking-methodology-title"
            aria-modal="true"
            className="ranking-methodology-dialog"
            role="dialog"
            tabIndex={-1}
          >
            <div className="ranking-methodology-dialog-header">
              <h2 id="ranking-methodology-title">랭킹 산정 방식</h2>
              <button
                aria-label="닫기"
                className="ranking-methodology-close"
                onClick={closeDialog}
                ref={closeButtonRef}
                title="닫기"
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <p>
              대회 성적에 진출 단계, 대회 위상, 참가 규모, 최근 연도 가중치를
              적용합니다.
            </p>
            <p>같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.</p>
            <p>
              WEMIX OPEN 2025는 전체 대진 검증 전이라 현재 점수에서
              제외합니다.
            </p>
            <Link href="/methodology" ref={detailLinkRef}>
              계산식 자세히 보기
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
