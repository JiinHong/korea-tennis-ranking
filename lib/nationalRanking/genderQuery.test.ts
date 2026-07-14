import { describe, expect, it } from "vitest";

import { parseRankingGender } from "./genderQuery";

describe("parseRankingGender", () => {
  it.each(["men", "women", "combined"] as const)(
    "%s를 유효한 랭킹 부문으로 반환한다",
    (gender) => {
      expect(parseRankingGender(gender, "men")).toBe(gender);
    }
  );

  it.each([null, undefined, "", "invalid"])(
    "%s는 지정한 기본 부문으로 대체한다",
    (value) => {
      expect(parseRankingGender(value, "women")).toBe("women");
    }
  );
});
