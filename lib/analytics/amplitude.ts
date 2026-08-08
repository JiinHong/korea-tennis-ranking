"use client";

import * as amplitude from "@amplitude/unified";

import { getAnalyticsPageContext } from "./pageTracking";

const AMPLITUDE_API_KEY = "5a5f7a18362a3d5d282689d0e58e00db";
const ANALYTICS_STATE_KEY = "__KOREA_TENNIS_AMPLITUDE_STATE__";
const INTERNAL_ANALYTICS_USER_ID = "internal:jinhong";
const NATIONAL_RANKING_DISCLOSURE_SELECTOR =
  ".national-ranking-main-row, .national-ranking-club-disclosure";

type TrafficType = "external" | "internal";

type AnalyticsState = {
  initPromise?: Promise<void>;
  initialized: boolean;
  lastTrackedPagePath?: string;
  optedOut: boolean;
  trafficPromise?: Promise<TrafficType>;
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

function isAnalyticsExcludedPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/internal/analytics" ||
    pathname.startsWith("/internal/analytics/")
  );
}

function shouldTrackFrustrationInteraction(
  _actionType: "click" | "change",
  element: Element
): boolean {
  // 랭킹 행은 클릭 즉시 상세 결과를 정상적으로 펼치는 컨트롤이다.
  // 이 동작은 이름 있는 이벤트로 추적하므로 Amplitude의 좌절 클릭 후보에서만 뺀다.
  return element.closest(NATIONAL_RANKING_DISCLOSURE_SELECTOR) === null;
}

async function getTrafficType(): Promise<TrafficType> {
  const state = getAnalyticsState();

  state.trafficPromise ??= fetch("/api/internal/analytics", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) return "external";

      const body = (await response.json()) as { internal?: unknown };
      return body.internal === true ? "internal" : "external";
    })
    .catch(() => "external");

  return state.trafficPromise;
}

export async function syncAmplitudeRoute(pathname: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const state = getAnalyticsState();

  if (isAnalyticsExcludedPath(pathname)) {
    if (state.initPromise && !state.optedOut) {
      await state.initPromise;

      if (state.initialized) {
        amplitude.setOptOut(true);
        state.optedOut = true;
      }
    }

    return;
  }

  if (!state.initPromise) {
    state.initPromise = getTrafficType()
      .then((trafficType) => {
        const identify = new amplitude.Identify().set(
          "traffic_type",
          trafficType
        );

        return amplitude.initAll(AMPLITUDE_API_KEY, {
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
            identify,
            // 원격 설정이 위의 오탐 제외 규칙을 덮어쓰지 않도록 코드 설정을 기준으로 삼는다.
            remoteConfig: { fetchRemoteConfig: false },
            ...(trafficType === "internal"
              ? { userId: INTERNAL_ANALYTICS_USER_ID }
              : {}),
          },
          sessionReplay: { sampleRate: 1 },
        });
      })
      .then(() => {
        state.initialized = true;
      })
      .catch(() => {
        state.initialized = false;
      });
  }

  await state.initPromise;

  if (state.initialized && state.optedOut) {
    amplitude.setOptOut(false);
    state.optedOut = false;
  }
}

export async function setAmplitudeTrafficType(
  trafficType: TrafficType
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const state = getAnalyticsState();

  // 등록 상태가 바뀐 뒤 다른 라우트에서 이전 조회 결과를 재사용하지 않도록 갱신한다.
  state.trafficPromise = Promise.resolve(trafficType);

  if (state.initPromise) {
    await state.initPromise;
  } else {
    await syncAmplitudeRoute(window.location.pathname);
  }

  if (!state.initialized) {
    return;
  }

  if (trafficType === "internal") {
    amplitude.setUserId(INTERNAL_ANALYTICS_USER_ID);
  } else {
    // 기기 ID와 SDK 인스턴스는 유지하고 내부 사용자 ID만 제거한다.
    amplitude.setUserId(undefined);
  }

  const identify = new amplitude.Identify().set(
    "traffic_type",
    trafficType
  );
  amplitude.identify(identify);
}

export async function trackAmplitudeEvent(
  eventName: string,
  properties?: AmplitudeEventProperties
): Promise<void> {
  if (
    typeof window === "undefined" ||
    isAnalyticsExcludedPath(window.location.pathname)
  ) {
    return;
  }

  await syncAmplitudeRoute(window.location.pathname);

  if (!getAnalyticsState().initialized) {
    return;
  }

  amplitude.track(eventName, properties);
}

export async function trackAmplitudePageView(
  pathname: string
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await syncAmplitudeRoute(pathname);

  const state = getAnalyticsState();
  const page = getAnalyticsPageContext(pathname);

  if (!page) {
    // 제외 화면을 거쳐 같은 공개 페이지로 돌아오면 새 조회로 기록한다.
    state.lastTrackedPagePath = undefined;
    return;
  }

  if (!state.initialized || state.lastTrackedPagePath === page.pagePath) {
    return;
  }

  amplitude.track("Site Page Viewed", {
    page_name: page.pageName,
    page_path: page.pagePath,
    page_title: document.title,
    page_type: page.pageType,
    ...(page.clubSlug ? { club_slug: page.clubSlug } : {}),
    ...(page.nationalClubSlug
      ? { national_club_slug: page.nationalClubSlug }
      : {}),
    ...(page.playerName ? { player_name: page.playerName } : {}),
  });
  state.lastTrackedPagePath = page.pagePath;
}
