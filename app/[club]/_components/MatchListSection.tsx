import type { MatchRecord } from "@/lib/googleSheets/currentMatches";
import { ArrowRight, Check } from "lucide-react";
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
  return rank === null ? "–" : String(rank);
}

function getPlayerScores(match: MatchRecord) {
  const parsedScore = match.score.match(/^\s*(\d+)\s*:\s*(\d+)\s*$/);

  if (!parsedScore) {
    return null;
  }

  const [, winnerScore, loserScore] = parsedScore;

  if (match.winner === match.challenger) {
    return { challenger: winnerScore, defender: loserScore };
  }

  if (match.winner === match.defender) {
    return { challenger: loserScore, defender: winnerScore };
  }

  return null;
}

function MatchPlayerRow({
  isWinner,
  name,
  rank,
  score,
}: {
  isWinner: boolean;
  name: string;
  rank: number | null;
  score: string | null;
}) {
  return (
    <div className="club-match-player-row">
      <span className="club-match-player-identity">
        <strong>{name}</strong>
        <span className="club-match-player-rank">({formatRank(rank)})</span>
        {isWinner ? (
          <span aria-label="승자" className="match-winner-check">
            <Check aria-hidden="true" />
          </span>
        ) : null}
      </span>
      {score ? (
        <strong className="club-match-player-score">{score}</strong>
      ) : null}
    </div>
  );
}

function MatchCard({ match }: { match: MatchRecord }) {
  const playerScores = getPlayerScores(match);

  return (
    <li className="club-match-card">
      <div className="club-match-date">
        <strong>{match.date}</strong>
        <span>{match.defenseResult}</span>
      </div>

      <div className="club-match-players">
        <MatchPlayerRow
          isWinner={match.winner === match.challenger}
          name={match.challenger}
          rank={match.challengerRank}
          score={playerScores?.challenger ?? null}
        />
        <MatchPlayerRow
          isWinner={match.winner === match.defender}
          name={match.defender}
          rank={match.defenderRank}
          score={playerScores?.defender ?? null}
        />
        {playerScores === null && match.score ? (
          <span className="club-match-score-fallback">{match.score}</span>
        ) : null}
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

      {moreHref ? (
        <Link
          className="club-match-more"
          href={moreHref}
          aria-label="View all"
          title="View all"
        >
          <span>View all</span>
          <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
        </Link>
      ) : null}
    </section>
  );
}
