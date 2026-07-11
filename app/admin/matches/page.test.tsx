import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getAdminMatchClubs } from "@/lib/supabaseAdminMatches";

import AdminMatchesPage, { metadata } from "./page";

vi.mock("@/lib/supabaseAdminMatches", () => ({
  getAdminMatchClubs: vi.fn(),
}));

vi.mock("./AdminMatchManager", () => ({
  default: ({ clubs }: { clubs: Array<{ name: string }> }) => (
    <div>{clubs.map((club) => club.name).join(", ")}</div>
  ),
}));

describe("AdminMatchesPage", () => {
  it("renders live clubs inside a dedicated match management page", async () => {
    vi.mocked(getAdminMatchClubs).mockResolvedValue([
      {
        id: "club-seoultech",
        slug: "seoultech",
        name: "서울과학기술대학교 테니스",
        title: "단식 랭킹",
        season: { id: "season-3", name: "시즌3" },
        players: [],
        matches: [],
      },
    ]);

    render(await AdminMatchesPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "경기 관리" })
    ).toBeDefined();
    expect(screen.getByText("서울과학기술대학교 테니스")).toBeDefined();
    expect(screen.getByText("변경 시 비밀키 확인")).toBeDefined();
    expect(screen.getByRole("link", { name: "운영 현황" }).getAttribute("href")).toBe(
      "/admin"
    );
  });

  it("keeps the match management route out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
