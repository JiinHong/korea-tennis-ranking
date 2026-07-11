import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getAdminMonthlyClubs } from "@/lib/supabaseMonthlySettlements";

import AdminMonthlyPage, { metadata } from "./page";

vi.mock("@/lib/supabaseMonthlySettlements", () => ({
  getAdminMonthlyClubs: vi.fn(),
}));

vi.mock("./AdminMonthlyManager", () => ({
  default: ({ clubs }: { clubs: Array<{ name: string }> }) => (
    <div>{clubs.map((club) => club.name).join(", ")}</div>
  ),
}));

describe("AdminMonthlyPage", () => {
  it("renders open preview data inside a dedicated monthly settlement page", async () => {
    vi.mocked(getAdminMonthlyClubs).mockResolvedValue([
      {
        id: "club-seoultech",
        slug: "seoultech",
        name: "서울과기대",
        title: "단식 랭킹",
        season: {
          id: "season-3",
          name: "시즌3",
          startsOn: "2026-07-01",
          endsOn: null,
        },
        penaltyDrop: 2,
        previews: [],
      },
    ]);

    render(await AdminMonthlyPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "월간 미참여 정산" })
    ).toBeDefined();
    expect(screen.getByText("서울과기대")).toBeDefined();
    expect(screen.getByText("미리보기는 비밀키 없음")).toBeDefined();
    expect(screen.getByRole("link", { name: "운영 현황" }).getAttribute("href")).toBe(
      "/admin"
    );
  });

  it("keeps the monthly settlement route out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
