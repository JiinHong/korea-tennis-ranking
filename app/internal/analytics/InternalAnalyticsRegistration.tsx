"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, ShieldCheck, Trash2 } from "lucide-react";

import { setAmplitudeTrafficType } from "@/lib/amplitudeAnalytics";

import styles from "./internalAnalytics.module.css";

type RegistrationResponse = {
  internal: boolean;
  message?: string;
};

export default function InternalAnalyticsRegistration() {
  const [internal, setInternal] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/internal/analytics", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as RegistrationResponse;
        if (active) setInternal(response.ok && data.internal);
      })
      .catch(() => {
        if (active) {
          setInternal(false);
          setMessage("등록 상태를 확인하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function registerBrowser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!secret.trim() || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/internal/analytics", {
        body: JSON.stringify({ secret: secret.trim() }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as RegistrationResponse;

      if (!response.ok || !data.internal) {
        throw new Error(data.message ?? "브라우저를 등록하지 못했습니다.");
      }

      await setAmplitudeTrafficType("internal");
      setInternal(true);
      setSecret("");
      setMessage("이 브라우저의 방문은 이제 내부 트래픽으로 분리됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function unregisterBrowser() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/internal/analytics", {
        method: "DELETE",
      });
      const data = (await response.json()) as RegistrationResponse;

      if (!response.ok || data.internal) {
        throw new Error(data.message ?? "등록을 해제하지 못했습니다.");
      }

      await setAmplitudeTrafficType("external");
      setInternal(false);
      setMessage("등록을 해제했습니다. 이후 방문은 일반 트래픽으로 기록됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (internal === null) {
    return (
      <div className={styles.loading} aria-live="polite">
        <span aria-hidden="true" />
        등록 상태 확인 중
      </div>
    );
  }

  return (
    <section className={styles.registration} aria-labelledby="registration-title">
      <div className={styles.statusRow}>
        <span
          className={`${styles.statusIcon} ${internal ? styles.internal : ""}`}
          aria-hidden="true"
        >
          {internal ? <ShieldCheck /> : <KeyRound />}
        </span>
        <div>
          <p className={styles.statusLabel}>현재 브라우저</p>
          <h2 id="registration-title">
            {internal ? "내부 사용자로 분리 중" : "일반 사용자로 기록 중"}
          </h2>
        </div>
        {internal ? (
          <span className={styles.verified}>
            <Check aria-hidden="true" />
            등록됨
          </span>
        ) : null}
      </div>

      {internal ? (
        <div className={styles.registeredActions}>
          <p>
            Amplitude에서 <strong>internal:jinhong</strong>으로 식별되며,
            실제 사용자 분석에서 별도로 제외할 수 있습니다.
          </p>
          <button
            className={styles.removeButton}
            type="button"
            onClick={unregisterBrowser}
            disabled={busy}
          >
            <Trash2 aria-hidden="true" />
            {busy ? "해제 중" : "등록 해제"}
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={registerBrowser}>
          <label htmlFor="internal-analytics-secret">
            내부 사용자 비밀키
          </label>
          <div className={styles.inputRow}>
            <input
              id="internal-analytics-secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              autoComplete="off"
              placeholder="Vercel에 등록한 비밀키"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !secret.trim()}>
              {busy ? "등록 중" : "이 브라우저 등록"}
            </button>
          </div>
          <p className={styles.formHint}>
            비밀키는 저장하지 않으며 서버에서 확인한 뒤 서명 쿠키만 남깁니다.
          </p>
        </form>
      )}

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
