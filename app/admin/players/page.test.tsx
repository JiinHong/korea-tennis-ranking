import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getAdminPlayerClubs } from "@/lib/supabaseAdminPlayers";

import AdminPlayersPage, { metadata } from "./page";

vi.mock("@/lib/supabaseAdminPlayers", () => ({
  getAdminPlayerClubs: vi.fn(),
}));

vi.mock("./AdminPlayerManager", () => ({
  default: ({ clubs }: { clubs: Array<{ name: string }> }) => (
    <div>{clubs.map((club) => club.name).join(", ")}</div>
  ),
}));

describe("AdminPlayersPage", () => {
  it("renders the current clubs inside a dedicated player management page", async () => {
    vi.mocked(getAdminPlayerClubs).mockResolvedValue([
      {
        id: "club-seoultech",
        slug: "seoultech",
        name: "서울과학기술대학교 테니스",
        title: "단식 랭킹",
        season: { id: "season-3", name: "시즌3" },
        players: [],
      },
    ]);

    render(await AdminPlayersPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "선수 관리" })
    ).toBeDefined();
    expect(screen.getByText("서울과학기술대학교 테니스")).toBeDefined();
    expect(screen.getByText("변경 시 비밀키 확인")).toBeDefined();
    expect(screen.getByRole("link", { name: "운영 현황" }).getAttribute("href")).toBe(
      "/admin"
    );
  });

  it("keeps the player management route out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
