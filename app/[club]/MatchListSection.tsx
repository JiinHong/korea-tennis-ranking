import type { MatchRecord } from "@/lib/matchLogTable";
import Link from "next/link";

type MatchListSectionProps = {
  matches: MatchRecord[];
  title: string;
  eyebrow: string;
  ariaLabel: string;
  limit?: number;
  moreHref?: string;
};

function parseMatchDate(date: string) {
  const numbers = date.match(/\d+/g)?.map(Number) ?? [];
  const [year, month, day] = numbers;

  if (!year || !month || !day) {
    return 0;
  }

  return new Date(year, month - 1, day).getTime();
}

function sortRecentMatches(matches: MatchRecord[]) {
  return matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => {
      const dateDiff = parseMatchDate(b.match.date) - parseMatchDate(a.match.date);

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return b.index - a.index;
    })
    .map(({ match }) => match);
}

function formatRank(rank: number | null) {
  if (rank === null) {
    return "순위 없음";
  }

  return `${rank}위`;
}

function getPlayerResult(match: MatchRecord, playerName: string) {
  if (match.winner === playerName) {
    return "W";
  }

  return "L";
}

function MatchCard({ match }: { match: MatchRecord }) {
  const challengerResult = getPlayerResult(match, match.challenger);
  const defenderResult = getPlayerResult(match, match.defender);

  return (
    <li className="club-match-card">
      <div className="club-match-date">
        <strong>{match.date}</strong>
        <span>{match.defenseResult}</span>
      </div>

      <div className="club-match-players">
        <div>
          <span
            className={`match-result-letter ${
              challengerResult === "W" ? "is-win" : "is-loss"
            }`}
            aria-label={challengerResult === "W" ? "도전자 승리" : "도전자 패배"}
          >
            {challengerResult}
          </span>
          <strong>{match.challenger}</strong>
          <em>도전자 · {formatRank(match.challengerRank)}</em>
        </div>

        <span className="match-versus" aria-hidden="true">
          vs
        </span>

        <div>
          <span
            className={`match-result-letter ${
              defenderResult === "W" ? "is-win" : "is-loss"
            }`}
            aria-label={defenderResult === "W" ? "방어자 승리" : "방어자 패배"}
          >
            {defenderResult}
          </span>
          <strong>{match.defender}</strong>
          <em>방어자 · {formatRank(match.defenderRank)}</em>
        </div>
      </div>

      <div className="club-match-score">
        <strong>{match.score}</strong>
        <span>{match.winner} 승</span>
      </div>
    </li>
  );
}

export default function MatchListSection({
  matches,
  title,
  eyebrow,
  ariaLabel,
  limit,
  moreHref,
}: MatchListSectionProps) {
  const sortedMatches = sortRecentMatches(matches);
  const visibleMatches =
    typeof limit === "number" ? sortedMatches.slice(0, limit) : sortedMatches;

  return (
    <section className="club-match-section" aria-label={ariaLabel}>
      <div className="club-match-section-head">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {moreHref ? (
          <Link className="club-match-more" href={moreHref}>
            전체 경기 더보기
          </Link>
        ) : null}
      </div>

      {visibleMatches.length > 0 ? (
        <ol className="club-match-list">
          {visibleMatches.map((match, index) => (
            <MatchCard
              key={`${match.date}-${match.challenger}-${match.defender}-${index}`}
              match={match}
            />
          ))}
        </ol>
      ) : (
        <p className="club-match-empty">아직 기록된 경기가 없습니다.</p>
      )}
    </section>
  );
}
