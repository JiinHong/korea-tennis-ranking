import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAmplitudeTrafficType } from "@/lib/amplitudeAnalytics";

import InternalAnalyticsRegistration from "./InternalAnalyticsRegistration";

vi.mock("@/lib/amplitudeAnalytics", () => ({
  setAmplitudeTrafficType: vi.fn(() => Promise.resolve()),
}));

describe("InternalAnalyticsRegistration", () => {
  beforeEach(() => {
    vi.mocked(setAmplitudeTrafficType).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("비밀키로 현재 브라우저를 내부 사용자로 등록한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ internal: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ internal: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<InternalAnalyticsRegistration />);

    expect(
      await screen.findByText("일반 사용자로 기록 중")
    ).toBeDefined();

    const secretInput = screen.getByLabelText("내부 사용자 비밀키");
    expect(secretInput.getAttribute("autocomplete")).toBe("off");

    fireEvent.change(secretInput, {
      target: { value: "a-long-test-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이 브라우저 등록" }));

    await waitFor(() => {
      expect(setAmplitudeTrafficType).toHaveBeenCalledWith("internal");
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/internal/analytics", {
      body: JSON.stringify({ secret: "a-long-test-secret" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(screen.getByText("내부 사용자로 분리 중")).toBeDefined();
  });

  it("등록 해제 시 현재 브라우저의 내부 사용자 ID도 초기화한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ internal: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ internal: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<InternalAnalyticsRegistration />);

    expect(
      await screen.findByText("내부 사용자로 분리 중")
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "등록 해제" }));

    await waitFor(() => {
      expect(setAmplitudeTrafficType).toHaveBeenCalledWith("external");
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/internal/analytics", {
      method: "DELETE",
    });
    expect(screen.getByText("일반 사용자로 기록 중")).toBeDefined();
  });
});
