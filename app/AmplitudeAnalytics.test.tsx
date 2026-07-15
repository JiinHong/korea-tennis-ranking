import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const analytics = vi.hoisted(() => ({ syncAmplitudeRoute: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("@/lib/amplitudeAnalytics", () => analytics);

import AmplitudeAnalytics from "./AmplitudeAnalytics";

describe("AmplitudeAnalytics", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    analytics.syncAmplitudeRoute.mockReset();
    analytics.syncAmplitudeRoute.mockResolvedValue(undefined);
  });

  it("현재 클라이언트 경로를 분석 초기화 모듈에 전달한다", async () => {
    const { rerender } = render(<AmplitudeAnalytics />);

    await waitFor(() => {
      expect(analytics.syncAmplitudeRoute).toHaveBeenCalledWith("/");
    });

    navigation.pathname = "/admin";
    rerender(<AmplitudeAnalytics />);

    await waitFor(() => {
      expect(analytics.syncAmplitudeRoute).toHaveBeenCalledWith("/admin");
    });
  });
});
