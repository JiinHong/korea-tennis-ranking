import { Check, X } from "lucide-react";

type MatchOutcomeIconProps = {
  result: "W" | "L";
  className?: string;
};

export default function MatchOutcomeIcon({
  result,
  className = "",
}: MatchOutcomeIconProps) {
  const isWin = result === "W";
  const Icon = isWin ? Check : X;
  const classes = [
    "match-outcome-icon",
    isWin ? "is-win" : "is-loss",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      aria-label={isWin ? "승리" : "패배"}
      className={classes}
      title={isWin ? "승" : "패"}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}
