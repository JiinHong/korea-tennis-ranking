import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  it("운영자와 랭킹 데이터 문의 경로를 모든 페이지에서 안내한다", () => {
    render(<SiteFooter />);

    expect(screen.getByText("koreatennisranking.com")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Jinhong Park" }).getAttribute("href")
    ).toBe(
      "https://billowy-nape-057.notion.site/Park-Jin-Hong-3ab70abb9b0980dfba4dd310a3439f3a?source=copy_link"
    );
    expect(
      screen
        .getByRole("link", { name: "랭킹 데이터 관련 문의" })
        .getAttribute("href")
    ).toBe(
      "https://docs.google.com/forms/d/e/1FAIpQLSfmGPqEZ9seYVT4byNnhACUZjS6oNCkuqKq4jbJiJzevFl5jA/viewform"
    );
    expect(
      screen.getByText("© 2026 Korea Campus Tennis Ranking")
    ).toBeTruthy();
  });

  it("외부 링크를 안전하게 새 탭에서 연다", () => {
    render(<SiteFooter />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer");
    }
  });
});
