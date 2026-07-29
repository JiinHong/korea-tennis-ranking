"use client";

import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "5a5f7a18362a3d5d282689d0e58e00db";
const ANALYTICS_STATE_KEY = "__KOREA_TENNIS_AMPLITUDE_STATE__";
const NATIONAL_RANKING_DISCLOSURE_SELECTOR =
  ".national-ranking-main-row, .national-ranking-club-disclosure";

type AnalyticsState = {
  initPromise?: Promise<void>;
  initialized: boolean;
  optedOut: boolean;
};

type AnalyticsGlobal = typeof globalThis & {
  [ANALYTICS_STATE_KEY]?: AnalyticsState;
};

export type AmplitudeEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

function getAnalyticsState(): AnalyticsState {
  const analyticsGlobal = globalThis as AnalyticsGlobal;

  analyticsGlobal[ANALYTICS_STATE_KEY] ??= {
    initialized: false,
    optedOut: false,
  };

  return analyticsGlobal[ANALYTICS_STATE_KEY];
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function shouldTrackFrustrationInteraction(
  _actionType: "click" | "change",
  element: Element
): boolean {
  // 랭킹 행은 클릭 즉시 상세 결과를 정상적으로 펼치는 컨트롤이다.
  // 이 동작은 이름 있는 이벤트로 추적하므로 Amplitude의 좌절 클릭 후보에서만 뺀다.
  return element.closest(NATIONAL_RANKING_DISCLOSURE_SELECTOR) === null;
}

export async function syncAmplitudeRoute(pathname: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const state = getAnalyticsState();

  if (isAdminPath(pathname)) {
    if (state.initPromise && !state.optedOut) {
      await state.initPromise;

      if (state.initialized) {
        amplitude.setOptOut(true);
        state.optedOut = true;
      }
    }

    return;
  }

  state.initPromise ??= amplitude
    .initAll(AMPLITUDE_API_KEY, {
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
            shouldTrackEventResolver: shouldTrackFrustrationInteraction,
            thrashedCursor: true,
          },
          networkTracking: true,
          pageUrlEnrichment: true,
          pageViews: true,
          performanceTracking: false,
          sessions: true,
          webVitals: true,
        },
        // 원격 설정이 위의 오탐 제외 규칙을 덮어쓰지 않도록 코드 설정을 기준으로 삼는다.
        remoteConfig: { fetchRemoteConfig: false },
      },
      sessionReplay: { sampleRate: 1 },
    })
    .then(() => {
      state.initialized = true;
    })
    .catch(() => {
      state.initialized = false;
    });

  await state.initPromise;

  if (state.initialized && state.optedOut) {
    amplitude.setOptOut(false);
    state.optedOut = false;
  }
}

export async function trackAmplitudeEvent(
  eventName: string,
  properties?: AmplitudeEventProperties
): Promise<void> {
  if (
    typeof window === "undefined" ||
    isAdminPath(window.location.pathname)
  ) {
    return;
  }

  await syncAmplitudeRoute(window.location.pathname);

  if (!getAnalyticsState().initialized) {
    return;
  }

  amplitude.track(eventName, properties);
}
