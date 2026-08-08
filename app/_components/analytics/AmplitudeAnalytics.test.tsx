import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const analytics = vi.hoisted(() => ({ trackAmplitudePageView: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("@/lib/analytics/amplitude", () => analytics);

import AmplitudeAnalytics from "./AmplitudeAnalytics";

describe("AmplitudeAnalytics", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    analytics.trackAmplitudePageView.mockReset();
    analytics.trackAmplitudePageView.mockResolvedValue(undefined);
  });

  it("현재 클라이언트 경로를 페이지 조회 추적 모듈에 전달한다", async () => {
    const { rerender } = render(<AmplitudeAnalytics />);

    await waitFor(() => {
      expect(analytics.trackAmplitudePageView).toHaveBeenCalledWith("/");
    });

    navigation.pathname = "/admin";
    rerender(<AmplitudeAnalytics />);

    await waitFor(() => {
      expect(analytics.trackAmplitudePageView).toHaveBeenCalledWith("/admin");
    });
  });
});
