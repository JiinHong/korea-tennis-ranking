import { afterEach, describe, expect, it } from "vitest";

import { getSpreadsheetId } from "@/lib/googleSheets";

describe("getSpreadsheetId", () => {
  const previousGoogleSheetId = process.env.GOOGLE_SHEET_ID;
  const previousPetcSheetId = process.env.PETC_SHEET_ID;

  afterEach(() => {
    if (previousGoogleSheetId === undefined) {
      delete process.env.GOOGLE_SHEET_ID;
    } else {
      process.env.GOOGLE_SHEET_ID = previousGoogleSheetId;
    }

    if (previousPetcSheetId === undefined) {
      delete process.env.PETC_SHEET_ID;
    } else {
      process.env.PETC_SHEET_ID = previousPetcSheetId;
    }
  });

  it("기본값으로 GOOGLE_SHEET_ID를 읽는다", () => {
    process.env.GOOGLE_SHEET_ID = "seoultech-sheet-id";

    expect(getSpreadsheetId()).toBe("seoultech-sheet-id");
  });

  it("env 이름을 넘기면 그 환경변수에서 sheet id를 읽는다", () => {
    process.env.PETC_SHEET_ID = "petc-sheet-id";

    expect(getSpreadsheetId("PETC_SHEET_ID")).toBe("petc-sheet-id");
  });
});
