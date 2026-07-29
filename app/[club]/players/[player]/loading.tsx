export default function PlayerDetailLoading() {
  return (
    <main className="ranking-page campus-ranking-page player-detail-page">
      <div className="content-shell player-detail-loading-shell">
        <section
          aria-live="polite"
          className="player-detail-loading"
          role="status"
        >
          <span
            aria-hidden="true"
            className="player-detail-loading-indicator"
          />
          <p>선수 기록 불러오는 중</p>
        </section>
      </div>
    </main>
  );
}
