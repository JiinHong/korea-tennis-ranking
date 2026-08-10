import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import { metadata } from "./layout";

describe("root metadata", () => {
  it("브라우저 탭 파비콘에 단색 2:3 잔디 코트 이미지를 사용한다", () => {
    const icon = readFileSync(join(process.cwd(), "app/icon.png"));
    const iconHash = createHash("sha256").update(icon).digest("hex");

    expect(icon.readUInt32BE(16)).toBe(1024);
    expect(icon.readUInt32BE(20)).toBe(1536);
    expect(iconHash).toBe(
      "9fef73382b5ebbed298526c015f24f5542575f4bd3d1ce238775d3fc8e6d1f53"
    );
  });

  it("이전 테니스공 파비콘을 함께 노출하지 않는다", () => {
    expect(existsSync(join(process.cwd(), "app/favicon.ico"))).toBe(false);
  });

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

  it("시스템 테마를 기본값으로 사용하고 루트의 테마 클래스를 안전하게 동기화한다", () => {
    const layoutSource = readFileSync(
      join(process.cwd(), "app/layout.tsx"),
      "utf8"
    );
    const providerSource = readFileSync(
      join(process.cwd(), "app/_components/theme/ThemeProvider.tsx"),
      "utf8"
    );

    expect(layoutSource).toContain("<ThemeProvider>");
    expect(layoutSource).toContain("suppressHydrationWarning");
    expect(providerSource).toContain('attribute="class"');
    expect(providerSource).toContain('defaultTheme="system"');
    expect(providerSource).toContain("enableSystem");
    expect(providerSource).toContain("enableColorScheme");
  });
});
