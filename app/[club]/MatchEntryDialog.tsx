"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type MatchOption = {
  id: string;
  name: string;
  rank: number;
};

type RematchCooldown = {
  playerAId: string;
  playerBId: string;
  availableOn: string;
};

type MatchOptionsResponse =
  | {
      ok: true;
      players: MatchOption[];
      challengeRange: number;
      rematchCooldowns: RematchCooldown[];
    }
  | { ok: false; message: string };

type MatchSubmitResponse =
  | { ok: true; message: string }
  | { ok: false; message: string };

type MatchEntryDialogProps = {
  clubSlug: string;
  open: boolean;
  onClose: () => void;
  onRecorded: () => void | Promise<void>;
};

function createSourceKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function opponentOptions(
  players: MatchOption[],
  selectedPlayerId: string,
  challengeRange: number
): MatchOption[] {
  if (!selectedPlayerId) {
    return players;
  }

  const selectedIndex = players.findIndex(
    (player) => player.id === selectedPlayerId
  );

  if (selectedIndex === -1) {
    return players;
  }

  return players.filter((_, index) => {
    const distance = Math.abs(index - selectedIndex);

    return distance >= 1 && distance <= challengeRange;
  });
}

function findRematchCooldown(
  rematchCooldowns: RematchCooldown[],
  playerId: string,
  opponentId: string
): RematchCooldown | undefined {
  return rematchCooldowns.find(
    (cooldown) =>
      (cooldown.playerAId === playerId && cooldown.playerBId === opponentId) ||
      (cooldown.playerAId === opponentId && cooldown.playerBId === playerId)
  );
}

function formatAvailableOn(value: string): string {
  const [, month, day] = value.split("-").map(Number);

  return `${month}월 ${day}일부터 가능`;
}

function rematchCooldownSummary(
  options: MatchOption[],
  selectedOpponentId: string,
  rematchCooldowns: RematchCooldown[]
): string {
  const unavailableOpponents = options.flatMap((player) => {
    const cooldown = findRematchCooldown(
      rematchCooldowns,
      player.id,
      selectedOpponentId
    );

    return cooldown
      ? [`${player.rank}위 · ${player.name} · ${formatAvailableOn(cooldown.availableOn)}`]
      : [];
  });

  return unavailableOpponents.length > 0
    ? `재경기 제한 상대: ${unavailableOpponents.join(", ")}`
    : "현재 재경기 제한 상대가 없습니다.";
}

export default function MatchEntryDialog({
  clubSlug,
  open,
  onClose,
  onRecorded,
}: MatchEntryDialogProps) {
  const [players, setPlayers] = useState<MatchOption[]>([]);
  const [challengeRange, setChallengeRange] = useState(0);
  const [rematchCooldowns, setRematchCooldowns] = useState<RematchCooldown[]>(
    []
  );
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [player1Score, setPlayer1Score] = useState("");
  const [player2Score, setPlayer2Score] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const onCloseRef = useRef(onClose);
  const player1CooldownDescriptionId = useId();
  const player2CooldownDescriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const previousOverflow = document.body.style.overflow;
    let active = true;

    document.body.style.overflow = "hidden";
    setPlayer1Id("");
    setPlayer2Id("");
    setPlayer1Score("");
    setPlayer2Score("");
    setErrorMessage("");
    setSourceKey(createSourceKey());
    setChallengeRange(0);
    setRematchCooldowns([]);
    setLoadingPlayers(true);

    void fetch(`/api/clubs/${clubSlug}/matches`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as MatchOptionsResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.ok ? "선수 명단을 불러오지 못했습니다." : data.message);
        }

        if (active) {
          setPlayers(data.players);
          setChallengeRange(data.challengeRange);
          setRematchCooldowns(data.rematchCooldowns);
        }
      })
      .catch((error) => {
        if (
          !active ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) {
          setLoadingPlayers(false);
        }
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      active = false;
      controller.abort();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clubSlug, open]);

  const canSubmit = useMemo(() => {
    const scores = [Number(player1Score), Number(player2Score)];

    return (
      player1Id.length > 0 &&
      player2Id.length > 0 &&
      player1Id !== player2Id &&
      player1Score.length > 0 &&
      player2Score.length > 0 &&
      scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 6) &&
      !submitting
    );
  }, [player1Id, player1Score, player2Id, player2Score, submitting]);
  const player1Options = opponentOptions(players, player2Id, challengeRange);
  const player2Options = opponentOptions(players, player1Id, challengeRange);
  const player1CooldownSummary = rematchCooldownSummary(
    player1Options,
    player2Id,
    rematchCooldowns
  );
  const player2CooldownSummary = rematchCooldownSummary(
    player2Options,
    player1Id,
    rematchCooldowns
  );

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/clubs/${clubSlug}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Id,
          player2Id,
          player1Score: Number(player1Score),
          player2Score: Number(player2Score),
          sourceKey,
        }),
      });
      const data = (await response.json()) as MatchSubmitResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message);
      }

      await onRecorded();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="match-entry-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="match-entry-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-entry-title"
      >
        <header className="match-entry-header">
          <div>
            <h2 id="match-entry-title">경기 결과 입력</h2>
            <p>방금 끝난 단식 경기의 선수와 점수를 입력해주세요.</p>
          </div>
          <button
            className="match-entry-close"
            type="button"
            onClick={onClose}
            aria-label="경기 결과 입력 닫기"
            title="닫기"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <form className="match-entry-form" onSubmit={handleSubmit}>
          <div className="match-player-grid">
            <label className="match-entry-field">
              <span>선수 1</span>
              <select
                aria-label="선수 1"
                aria-describedby={player1CooldownDescriptionId}
                value={player1Id}
                onChange={(event) => setPlayer1Id(event.target.value)}
                disabled={loadingPlayers}
                required
              >
                <option value="">
                  {loadingPlayers ? "불러오는 중" : "선택"}
                </option>
                {player1Options.map((player) => {
                  const cooldown = findRematchCooldown(
                    rematchCooldowns,
                    player.id,
                    player2Id
                  );

                  return (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={player.id === player2Id || Boolean(cooldown)}
                    >
                      {player.rank}위 · {player.name}
                      {cooldown
                        ? ` · ${formatAvailableOn(cooldown.availableOn)}`
                        : ""}
                    </option>
                  );
                })}
              </select>
              <p
                id={player1CooldownDescriptionId}
                className="visually-hidden"
                aria-live="polite"
              >
                {player1CooldownSummary}
              </p>
            </label>

            <span className="match-entry-versus" aria-hidden="true">
              vs
            </span>

            <label className="match-entry-field">
              <span>선수 2</span>
              <select
                aria-label="선수 2"
                aria-describedby={player2CooldownDescriptionId}
                value={player2Id}
                onChange={(event) => setPlayer2Id(event.target.value)}
                disabled={loadingPlayers}
                required
              >
                <option value="">
                  {loadingPlayers ? "불러오는 중" : "선택"}
                </option>
                {player2Options.map((player) => {
                  const cooldown = findRematchCooldown(
                    rematchCooldowns,
                    player.id,
                    player1Id
                  );

                  return (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={player.id === player1Id || Boolean(cooldown)}
                    >
                      {player.rank}위 · {player.name}
                      {cooldown
                        ? ` · ${formatAvailableOn(cooldown.availableOn)}`
                        : ""}
                    </option>
                  );
                })}
              </select>
              <p
                id={player2CooldownDescriptionId}
                className="visually-hidden"
                aria-live="polite"
              >
                {player2CooldownSummary}
              </p>
            </label>
          </div>

          <div className="match-score-grid">
            <label className="match-entry-field">
              <span>선수 1 점수</span>
              <input
                aria-label="선수 1 점수"
                type="number"
                min="0"
                max="6"
                step="1"
                inputMode="numeric"
                value={player1Score}
                onChange={(event) => setPlayer1Score(event.target.value)}
                required
              />
            </label>

            <span className="match-score-divider" aria-hidden="true">
              :
            </span>

            <label className="match-entry-field">
              <span>선수 2 점수</span>
              <input
                aria-label="선수 2 점수"
                type="number"
                min="0"
                max="6"
                step="1"
                inputMode="numeric"
                value={player2Score}
                onChange={(event) => setPlayer2Score(event.target.value)}
                required
              />
            </label>
          </div>

          <p className="match-entry-guidance">
            부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면
            관리자에게 부상 종료를 보고해주세요.
          </p>

          {errorMessage ? (
            <p className="match-entry-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="match-entry-submit"
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? "반영 중" : "결과 반영"}
          </button>
        </form>
      </section>
    </div>
  );
}
