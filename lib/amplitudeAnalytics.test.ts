import { beforeEach, describe, expect, it, vi } from "vitest";

const amplitudeSdk = vi.hoisted(() => ({
  initAll: vi.fn(() => Promise.resolve()),
  setOptOut: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@amplitude/unified", () => amplitudeSdk);

import {
  syncAmplitudeRoute,
  trackAmplitudeEvent,
} from "./amplitudeAnalytics";

const analyticsStateKey = "__KOREA_TENNIS_AMPLITUDE_STATE__";

describe("Amplitude analytics", () => {
  beforeEach(() => {
    amplitudeSdk.initAll.mockClear();
    amplitudeSdk.setOptOut.mockClear();
    amplitudeSdk.track.mockClear();
    Reflect.deleteProperty(globalThis, analyticsStateKey);
    window.history.replaceState({}, "", "/");
  });

  it("공개 페이지에서 Analytics와 Session Replay를 정확히 한 번 초기화한다", async () => {
    await Promise.all([
      syncAmplitudeRoute("/"),
      syncAmplitudeRoute("/methodology"),
    ]);

    expect(amplitudeSdk.initAll).toHaveBeenCalledTimes(1);
    expect(amplitudeSdk.initAll).toHaveBeenCalledWith(
      "5a5f7a18362a3d5d282689d0e58e00db",
      {
        analytics: {
          autocapture: {
            attribution: true,
            elementInteractions: true,
            fileDownloads: true,
            formInteractions: true,
            frustrationInteractions: {
              deadClicks: true,
              errorClicks: true,
              rageClicks: true,
              shouldTrackEventResolver: expect.any(Function),
              thrashedCursor: true,
            },
            networkTracking: true,
            pageUrlEnrichment: true,
            pageViews: true,
            performanceTracking: false,
            sessions: true,
            webVitals: true,
          },
          remoteConfig: { fetchRemoteConfig: false },
        },
        sessionReplay: { sampleRate: 1 },
      }
    );
  });

  it("정상적으로 펼쳐지는 전국 랭킹 행만 좌절 클릭 감지에서 제외한다", async () => {
    await syncAmplitudeRoute("/");

    type AutocaptureConfig = {
      frustrationInteractions: {
        shouldTrackEventResolver: (
          actionType: "click" | "change",
          element: Element
        ) => boolean;
      };
    };
    const [, initOptions] = amplitudeSdk.initAll.mock
      .calls[0] as unknown as [
      string,
      {
        analytics: {
          autocapture: boolean | AutocaptureConfig;
        };
      },
    ];

    expect(typeof initOptions.analytics.autocapture).toBe("object");

    const autocapture = initOptions.analytics.autocapture as AutocaptureConfig;
    const resolver =
      autocapture.frustrationInteractions.shouldTrackEventResolver;
    const rankingRow = document.createElement("tr");
    const rankingCell = document.createElement("td");
    const ordinaryButton = document.createElement("button");

    rankingRow.className = "national-ranking-main-row";
    rankingRow.append(rankingCell);

    expect(resolver("click", rankingCell)).toBe(false);
    expect(resolver("click", ordinaryButton)).toBe(true);
  });

  it("관리자 페이지에 직접 접속하면 분석 도구를 초기화하지 않는다", async () => {
    await syncAmplitudeRoute("/admin/players");

    expect(amplitudeSdk.initAll).not.toHaveBeenCalled();
    expect(amplitudeSdk.setOptOut).not.toHaveBeenCalled();
  });

  it("공개 페이지와 관리자 페이지 사이를 이동해도 같은 초기화를 재사용한다", async () => {
    await syncAmplitudeRoute("/");
    await syncAmplitudeRoute("/admin");
    await syncAmplitudeRoute("/clubs/seoultech-neutinamu");

    expect(amplitudeSdk.initAll).toHaveBeenCalledTimes(1);
    expect(amplitudeSdk.setOptOut).toHaveBeenNthCalledWith(1, true);
    expect(amplitudeSdk.setOptOut).toHaveBeenNthCalledWith(2, false);
  });

  it("이름 있는 사용자 행동 이벤트와 속성을 전송한다", async () => {
    await trackAmplitudeEvent("Ranking Division Viewed", {
      division: "women",
    });

    expect(amplitudeSdk.track).toHaveBeenCalledWith(
      "Ranking Division Viewed",
      { division: "women" }
    );
  });

  it("관리자 페이지에서는 사용자 행동 이벤트를 전송하지 않는다", async () => {
    window.history.replaceState({}, "", "/admin/matches");

    await trackAmplitudeEvent("Campus Ranking Refreshed", {
      club_slug: "seoultech",
    });

    expect(amplitudeSdk.initAll).not.toHaveBeenCalled();
    expect(amplitudeSdk.track).not.toHaveBeenCalled();
  });

  it("SDK 초기화가 실패해도 사용자 기능으로 오류를 전파하지 않는다", async () => {
    amplitudeSdk.initAll.mockRejectedValueOnce(new Error("Amplitude unavailable"));

    await expect(
      trackAmplitudeEvent("National Ranking Division Changed", {
        division: "men",
      })
    ).resolves.toBeUndefined();
    expect(amplitudeSdk.track).not.toHaveBeenCalled();
  });
});
