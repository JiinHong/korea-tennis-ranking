import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NationalPodiumCrown from "./NationalPodiumCrown";

describe("NationalPodiumCrown", () => {
  it.each([
    ["champion", "우승", "/national-ranking/gold-crown.png"],
    ["runner_up", "준우승", "/national-ranking/silver-crown.png"],
    ["semifinal", "4강", "/national-ranking/bronze-crown.png"],
  ] as const)("%s 단계를 알맞은 왕관으로 보여준다", (stage, alt, source) => {
    render(<NationalPodiumCrown stage={stage} />);

    expect(screen.getByRole("img", { name: alt }).getAttribute("src")).toContain(
      encodeURIComponent(source)
    );
  });

  it("장식용 왕관은 스크린 리더의 중복 설명에서 제외한다", () => {
    const { container } = render(
      <NationalPodiumCrown decorative stage="champion" />
    );

    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });
});
