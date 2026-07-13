import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseReadClient: vi.fn(),
  supabaseFrom: vi.fn(),
  unstableCache: vi.fn(<T extends (...args: never[]) => unknown>(callback: T) =>
    callback
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({
  getSupabaseReadClient: mocks.getSupabaseReadClient,
}));
vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

import {
  getNationalClubResultsPageData,
  type NationalClubResultReadAdapter,
  type NationalClubResultViewRow,
} from "./clubResults";

function resultRow(
  overrides: Partial<NationalClubResultViewRow> = {}
): NationalClubResultViewRow {
  return {
    club_slug: "seoultech-neutinamu",
    university_name: "서울과학기술대학교",
    club_name: "느티나무",
    display_name: "서울과학기술대학교 느티나무",
    tournament_slug: "yanggu",
    tournament_name: "국토정중앙배(양구)",
    edition_year: 2025,
    gender: "men",
    actual_entrants: 64,
    stage: "quarterfinal",
    source_team_name: "서울과기대 느티나무 A",
    team_label: "A",
    ...overrides,
  };
}

function createAdapter(
  rows: NationalClubResultViewRow[]
): NationalClubResultReadAdapter {
  return {
    listByClubSlug: vi.fn().mockResolvedValue(rows),
  };
}

describe("getNationalClubResultsPageData", () => {
  test("동아리 정보와 16강 이상 최고 성적을 최신순으로 변환한다", async () => {
    const data = await getNationalClubResultsPageData(
      "seoultech-neutinamu",
      createAdapter([
        resultRow({
          tournament_slug: "chuncheon",
          tournament_name: "춘천소양강배",
          edition_year: 2024,
          gender: "women",
          stage: "round_of_16",
        }),
        resultRow(),
      ])
    );

    expect(data).toEqual({
      club: {
        slug: "seoultech-neutinamu",
        universityName: "서울과학기술대학교",
        clubName: "느티나무",
        displayName: "서울과학기술대학교 느티나무",
      },
      results: [
        expect.objectContaining({
          tournamentSlug: "yanggu",
          year: 2025,
          gender: "men",
          stage: "quarterfinal",
        }),
        expect.objectContaining({
          tournamentSlug: "chuncheon",
          year: 2024,
          gender: "women",
          stage: "round_of_16",
        }),
      ],
    });
  });

  test("16강 이상 성적이 없는 동아리도 빈 결과 페이지로 유지한다", async () => {
    await expect(
      getNationalClubResultsPageData(
        "seoultech-neutinamu",
        createAdapter([
          resultRow({
            tournament_slug: null,
            tournament_name: null,
            edition_year: null,
            gender: null,
            actual_entrants: null,
            stage: null,
            source_team_name: null,
            team_label: null,
          }),
        ])
      )
    ).resolves.toEqual({
      club: expect.objectContaining({ slug: "seoultech-neutinamu" }),
      results: [],
    });
  });

  test("존재하지 않는 동아리는 null을 반환한다", async () => {
    await expect(
      getNationalClubResultsPageData("unknown", createAdapter([]))
    ).resolves.toBeNull();
  });
});

describe("default national club results adapter", () => {
  beforeEach(() => {
    mocks.getSupabaseReadClient.mockReset();
    mocks.supabaseFrom.mockReset();
    mocks.getSupabaseReadClient.mockReturnValue({ from: mocks.supabaseFrom });
  });

  test("공개 성적 뷰를 동아리 슬러그로 한 번만 조회한다", async () => {
    const yearOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order: yearOrder });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.supabaseFrom.mockReturnValue({ select });

    await expect(getNationalClubResultsPageData("kaist")).resolves.toBeNull();

    expect(mocks.supabaseFrom).toHaveBeenCalledWith(
      "public_national_club_results"
    );
    expect(eq).toHaveBeenCalledWith("club_slug", "kaist");
    expect(yearOrder).toHaveBeenCalledWith("edition_year", {
      ascending: false,
      nullsFirst: false,
    });
  });
});
