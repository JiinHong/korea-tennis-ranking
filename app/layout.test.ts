import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import { metadata } from "./layout";

describe("root metadata", () => {
  it("카카오톡 링크 미리보기에 전국 대학 동아리 랭킹 대표 이미지를 제공한다", () => {
    expect(metadata.metadataBase?.toString()).toBe(
      "https://koreatennisranking.com/"
    );
    expect(metadata.openGraph).toMatchObject({
      title: "전국 대학 테니스 동아리 랭킹",
      description: "우리학교 테니스 동아리 실시간 랭킹 확인!",
      url: "/",
      siteName: "Korea Tennis Club Ranking",
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: "/og-image-v2.png",
          width: 1540,
          height: 866,
          alt: "Korea Tennis Club Ranking",
        },
      ],
    });
  });
});
