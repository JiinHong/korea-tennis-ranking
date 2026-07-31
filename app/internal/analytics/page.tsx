import type { Metadata } from "next";

import InternalAnalyticsRegistration from "./InternalAnalyticsRegistration";
import styles from "./internalAnalytics.module.css";

export const metadata: Metadata = {
  title: "내부 분석 사용자 | Korea Tennis Ranking",
  robots: { index: false, follow: false },
};

export default function InternalAnalyticsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p>INTERNAL ANALYTICS</p>
          <h1>내 방문 기록 분리하기</h1>
          <span>
            운영자 검수 기록을 실제 사용자의 행동 데이터와 분리합니다.
          </span>
        </header>

        <InternalAnalyticsRegistration />

        <aside className={styles.guide}>
          <h2>브라우저마다 한 번씩 등록하세요</h2>
          <ol>
            <li>노트북에서 주로 사용하는 브라우저</li>
            <li>휴대폰 Safari 또는 Chrome</li>
            <li>카카오톡 링크로 연 카카오톡 인앱 브라우저</li>
          </ol>
          <p>
            브라우저마다 쿠키 저장 공간이 다르므로 같은 기기에서도 각각
            등록해야 합니다. 시크릿 모드와 앱 데이터 삭제 후에는 다시
            등록해야 합니다.
          </p>
        </aside>
      </div>
    </main>
  );
}
