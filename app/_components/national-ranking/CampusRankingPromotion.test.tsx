import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CampusRankingPromotion from "./CampusRankingPromotion";

describe("CampusRankingPromotion", () => {
  it("운영 중인 두 단식 랭킹과 도입 문의 링크를 보여준다", () => {
    render(<CampusRankingPromotion />);

    expect(
      screen.getByRole("heading", { name: "단식 랭킹 운영 중!" })
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "고려대 PETC 단식 랭킹" })
        .getAttribute("href")
    ).toBe("/petc");
    expect(
      screen
        .getByRole("link", { name: "서울과기대 느티나무 단식 랭킹" })
        .getAttribute("href")
    ).toBe("/seoultech");

    const inquiry = screen.getByRole("link", {
      name: "우리 동아리도 운영해보기 →",
    });

    expect(inquiry.getAttribute("href")).toBe(
      "https://open.kakao.com/o/sFSnlgIi"
    );
    expect(inquiry.getAttribute("target")).toBe("_blank");
    expect(inquiry.getAttribute("rel")).toBe("noopener noreferrer");

    const promotion = screen
      .getByRole("heading", { name: "단식 랭킹 운영 중!" })
      .closest("section");

    expect(promotion?.children[1]).toBe(inquiry);
    expect(promotion?.children[2]?.classList).toContain(
      "national-campus-ranking-links"
    );
  });

  it("학교 마크는 링크 문구와 중복되지 않는 장식 이미지로 사용한다", () => {
    const { container } = render(<CampusRankingPromotion />);

    const images = container.querySelectorAll("img");

    expect(images).toHaveLength(2);
    expect(Array.from(images).every((image) => image.getAttribute("alt") === ""))
      .toBe(true);
    expect(images[0]?.getAttribute("src")).toContain(
      encodeURIComponent("/petc-logo.png")
    );
    expect(images[1]?.getAttribute("src")).toContain(
      encodeURIComponent("/seoultech-symbol.png")
    );
    expect(images[0]?.getAttribute("width")).toBe("547");
    expect(images[0]?.getAttribute("height")).toBe("451");
    expect(images[1]?.getAttribute("width")).toBe("576");
    expect(images[1]?.getAttribute("height")).toBe("395");
  });
});
