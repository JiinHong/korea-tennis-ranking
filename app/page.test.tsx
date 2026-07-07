import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("전국 대학 동아리 랭킹 준비 화면과 주요 대회 목록을 보여준다", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "전국 대학 동아리 랭킹" })
    ).toBeDefined();
    expect(screen.getByText("국토정중앙배(양구)")).toBeDefined();
    expect(screen.getByText("경인지구 연맹전")).toBeDefined();
    expect(screen.getByText("하늘내린인제")).toBeDefined();
    expect(screen.getByText("춘천소양강배")).toBeDefined();
    expect(screen.getByText("영월")).toBeDefined();
    expect(screen.getByText("WEMIX OPEN")).toBeDefined();
    const seoultechLink = screen.getByRole("link", {
      name: "서울과기대 단테랭 보기",
    }) as HTMLAnchorElement;

    expect(seoultechLink.getAttribute("href")).toBe("/seoultech");
  });
});
