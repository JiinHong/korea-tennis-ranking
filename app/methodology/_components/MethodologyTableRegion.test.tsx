import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MethodologyTableRegion from "./MethodologyTableRegion";

describe("MethodologyTableRegion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("키보드 스크롤이 필요하지 않으면 탭 순서에 들어오지 않는다", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      }
    );

    render(
      <MethodologyTableRegion label="기준표">
        <table />
      </MethodologyTableRegion>
    );

    expect(
      screen.getByRole("region", { name: "기준표 스크롤 영역" }).getAttribute(
        "tabindex"
      )
    ).toBeNull();
  });

  it("내용이 가로로 넘칠 때만 키보드 스크롤을 위해 포커스할 수 있다", () => {
    let resizeCallback: ResizeObserverCallback = () => undefined;

    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }
        observe() {}
        disconnect() {}
      }
    );

    render(
      <MethodologyTableRegion label="기준표">
        <table />
      </MethodologyTableRegion>
    );

    const region = screen.getByRole("region", {
      name: "기준표 스크롤 영역",
    });
    Object.defineProperty(region, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(region, "scrollWidth", {
      configurable: true,
      value: 520,
    });

    act(() => resizeCallback([], {} as ResizeObserver));

    expect(region.getAttribute("tabindex")).toBe("0");
  });
});
