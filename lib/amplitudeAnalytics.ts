"use client";

import * as amplitude from "@amplitude/unified";

const AMPLITUDE_API_KEY = "5a5f7a18362a3d5d282689d0e58e00db";
const ANALYTICS_STATE_KEY = "__KOREA_TENNIS_AMPLITUDE_STATE__";

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
      analytics: { autocapture: true },
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
