import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const themeState = vi.hoisted(() => ({
  resolvedTheme: "dark",
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

import ThemeMenu from "./ThemeMenu";

describe("ThemeMenu", () => {
  beforeEach(() => {
    themeState.resolvedTheme = "dark";
    themeState.setTheme.mockClear();
  });

  it("다크 테마에서 라이트 테마로 전환한다", () => {
    render(<ThemeMenu />);

    fireEvent.click(
      screen.getByRole("button", { name: "라이트 테마로 전환" })
    );

    expect(themeState.setTheme).toHaveBeenCalledWith("light");
  });

  it("라이트 테마에서 다크 테마로 전환한다", () => {
    themeState.resolvedTheme = "light";
    render(<ThemeMenu />);

    fireEvent.click(
      screen.getByRole("button", { name: "다크 테마로 전환" })
    );

    expect(themeState.setTheme).toHaveBeenCalledWith("dark");
  });

  it("시스템 선택지 없이 한 개의 라이트·다크 토글만 제공한다", () => {
    render(<ThemeMenu />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "시스템 테마" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "라이트 테마로 전환" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});
