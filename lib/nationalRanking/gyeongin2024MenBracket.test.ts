import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  NationalRankingDataset,
  TeamResultInput,
} from "./types";

const EDITION_KEY = "gyeongin-2024-men";
const SOURCE_DIRECTORY = "경인지구/2024/남자";
const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

async function loadDataset(): Promise<NationalRankingDataset> {
  return JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;
}

function findResult(
  results: TeamResultInput[],
  sourceTeamName: string
): TeamResultInput | undefined {
  return results.find((result) => result.sourceTeamName === sourceTeamName);
}

describe("2024 경인지구 남자부 세로 연결 대진", () => {
  it("001~011 원본을 실제 대진 진행 순서로 보관한다", async () => {
    const dataset = await loadDataset();
    const edition = dataset.editions.find(({ key }) => key === EDITION_KEY);

    expect(edition).toMatchObject({
      actualEntrants: 48,
      sourceStatus: "verified",
    });
    expect(edition?.sourceRefs).toEqual([
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 001.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 002.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 003.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 004.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 005.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 006.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 007.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 008.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 009.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 010.jpeg`,
      `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 011.jpeg`,
    ]);
  });

  it("003과 007의 참가자 표기 충돌을 대진 슬롯 연속성으로 해소한다", async () => {
    const dataset = await loadDataset();
    const results = dataset.results.filter(
      (result) => result.editionKey === EDITION_KEY
    );

    expect(findResult(results, "DUTC A팀")).toMatchObject({
      clubSlug: "dongguk-dutc",
      stage: "round_of_16",
      qualityStatus: "verified",
    });
    expect(findResult(results, "단국대 A")).toMatchObject({
      clubSlug: "dankook-cheonan-dkutc",
      stage: "round_of_32",
      qualityStatus: "verified",
    });
  });

  it("이미 확인된 단일 동아리·관리자 확인 표기를 점수 계산 가능하게 보관한다", async () => {
    const dataset = await loadDataset();
    const results = dataset.results.filter(
      (result) => result.editionKey === EDITION_KEY
    );
    const expectedClubs = new Map([
      ["SSTC A", "soongsil-sstc"],
      ["아주대 A", "ajou-tennis"],
      ["경희대학교 A", "kyunghee-kuta-lovice"],
    ]);

    for (const [sourceTeamName, clubSlug] of expectedClubs) {
      expect(findResult(results, sourceTeamName), sourceTeamName).toMatchObject({
        clubSlug,
        qualityStatus: "verified",
      });
    }
  });

  it("16강 이후의 진출 결과와 최종 순위를 정확히 보관한다", async () => {
    const dataset = await loadDataset();
    const results = dataset.results.filter(
      (result) => result.editionKey === EDITION_KEY
    );
    const expectedStages = new Map<string, TeamResultInput["stage"]>([
      ["서울대학교 A", "champion"],
      ["아주대 A", "runner_up"],
      ["인천대학교 A", "semifinal"],
      ["서강대", "semifinal"],
      ["한국외대 A", "quarterfinal"],
      ["명지대A", "quarterfinal"],
      ["서울대학교B", "quarterfinal"],
      ["고려대학교 KUTC A", "quarterfinal"],
      ["연세대 YUTT 진리", "round_of_16"],
      ["아주대B", "round_of_16"],
      ["한양대에리카 A", "round_of_16"],
      ["경기대 KTF A", "round_of_16"],
      ["DUTC A팀", "round_of_16"],
      ["세종대", "round_of_16"],
      ["한양대 HYTC 사자", "round_of_16"],
      ["경희대학교 A", "round_of_16"],
    ]);

    expect(results).toHaveLength(48);
    for (const [sourceTeamName, stage] of expectedStages) {
      expect(findResult(results, sourceTeamName), sourceTeamName).toMatchObject({
        stage,
      });
    }

    expect(
      results.filter((result) => result.stage === "champion")
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.stage === "runner_up")
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.stage === "semifinal")
    ).toHaveLength(2);
    expect(
      results.filter((result) => result.stage === "quarterfinal")
    ).toHaveLength(4);
    expect(
      results.filter((result) => result.stage === "round_of_16")
    ).toHaveLength(8);
    expect(results.every((result) => result.stage !== null)).toBe(true);
  });
});
