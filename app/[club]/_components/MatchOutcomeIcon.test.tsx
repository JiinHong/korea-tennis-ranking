import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MatchOutcomeIcon from "./MatchOutcomeIcon";

describe("MatchOutcomeIcon", () => {
  it("승리를 W 없이 초록 체크 결과로 표시한다", () => {
    const { container } = render(
      <MatchOutcomeIcon className="form-dot" result="W" />
    );

    expect(screen.getByLabelText("승리")).toBeDefined();
    expect(screen.queryByText("W")).toBeNull();
    expect(
      container.querySelector(".match-outcome-icon.is-win.form-dot svg")
    ).not.toBeNull();
  });

  it("패배를 L 없이 빨간 X 결과로 표시한다", () => {
    const { container } = render(<MatchOutcomeIcon result="L" />);

    expect(screen.getByLabelText("패배")).toBeDefined();
    expect(screen.queryByText("L")).toBeNull();
    expect(
      container.querySelector(".match-outcome-icon.is-loss svg")
    ).not.toBeNull();
  });
});
