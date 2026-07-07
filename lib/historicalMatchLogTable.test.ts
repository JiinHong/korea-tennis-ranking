import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHistoricalMatchLogTable } from "@/lib/historicalMatchLogTable";
import { getSheetsClient } from "@/lib/googleSheets";

vi.mock("@/lib/googleSheets", () => ({
  getSpreadsheetId: vi.fn(() => "default-sheet-id"),
  getSheetsClient: vi.fn(),
}));

describe("getHistoricalMatchLogTable", () => {
  beforeEach(() => {
    vi.mocked(getSheetsClient).mockReset();
  });

  it("시즌1~2 기록 탭의 A:J 값을 과거 경기 기록으로 파싱한다", async () => {
    vi.mocked(getSheetsClient).mockReturnValue({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({
            data: {
              values: [
                [
                  "날짜",
                  "도전자(하위 랭커)",
                  "도전자 순위",
                  "방어자(상위 랭커)",
                  "방어자 순위",
                  "승자",
                  "스코어(예: 6:5)",
                  "방어 성공 실패",
                  "시즌",
                  "메모/출처",
                ],
                [
                  "2025. 12. 18",
                  "김도훈",
                  "4위",
                  "오준석",
                  "2위",
                  "오준석",
                  "6:1",
                  "방어 성공",
                  "시즌1",
                  "카톡 OCR",
                ],
                ["", "", "", "", "", "", "", "", "", ""],
              ],
            },
          }),
        },
      },
    } as never);

    const matches = await getHistoricalMatchLogTable("season3-sheet-id");

    expect(matches).toEqual([
      {
        date: "2025. 12. 18",
        challenger: "김도훈",
        challengerRank: 4,
        defender: "오준석",
        defenderRank: 2,
        winner: "오준석",
        score: "6:1",
        defenseResult: "방어 성공",
        season: "시즌1",
        sourceNote: "카톡 OCR",
      },
    ]);
  });
});
