import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme }),
}));

import ThemeMenu from "./ThemeMenu";

describe("ThemeMenu", () => {
  beforeEach(() => {
    setTheme.mockClear();
  });

  it.each([
    ["시스템 테마", "system"],
    ["라이트 테마", "light"],
    ["다크 테마", "dark"],
  ])("%s 선택을 next-themes에 전달한다", (label, theme) => {
    render(<ThemeMenu />);

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(setTheme).toHaveBeenCalledWith(theme);
  });

  it("현재 테마를 보조 기술에 선택 상태로 알린다", () => {
    render(<ThemeMenu />);

    expect(
      screen.getByRole("button", { name: "시스템 테마" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "다크 테마" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("false");
  });
});
