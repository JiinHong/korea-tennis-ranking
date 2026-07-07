import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ClubRankingClient from "./ClubRankingClient";

const club = {
  title: "단테랭",
  organization: "서울과학기술대학교 테니스",
  subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
  apiPath: "/api/clubs/seoultech/ranking",
};

describe("ClubRankingClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("캠퍼스 피드형 랭킹 화면 언어를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            {
              rank: 1,
              name: "오준석",
              note: "",
              wins: 0,
              losses: 0,
              matches: 0,
              recent5: [],
            },
            {
              rank: 7,
              name: "박종건",
              note: "",
              wins: 1,
              losses: 0,
              matches: 1,
              recent5: ["W"],
            },
          ],
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    expect(screen.getByText("캠퍼스 랭킹")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "오늘의 랭킹" })
    ).toBeDefined();
    expect((await screen.findAllByText("박종건")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "활동 피드" })).toBeDefined();
    expect(
      screen.getByRole("region", { name: "캠퍼스 랭킹 피드" })
    ).toBeDefined();
  });
});
