import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MatchEntryDialog from "./MatchEntryDialog";

function rankedPlayers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `선수${index + 1}`,
    rank: index + 1,
  }));
}

function optionValues(label: string): string[] {
  const select = screen.getByLabelText(label) as HTMLSelectElement;

  return Array.from(select.options).map((option) => option.value);
}

function optionByValue(label: string, value: string): HTMLOptionElement {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  const option = Array.from(select.options).find(
    (candidate) => candidate.value === value
  );

  if (!option) {
    throw new Error(`${label}에 ${value} 옵션이 없습니다.`);
  }

  return option;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MatchEntryDialog", () => {
  it("부상 종료는 관리자에게 보고해야 한다고 안내한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [],
          challengeRange: 4,
          rematchCooldowns: [],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        "부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요."
      )
    ).toBeDefined();
  });

  it("does not reload or reset the form when callback identities change", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        challengeRange: 4,
        rematchCooldowns: [],
        players: [
          { id: "p1", name: "오준석", rank: 1 },
          { id: "p4", name: "이민우", rank: 4 },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    const player1 = await screen.findByLabelText("선수 1");
    fireEvent.change(player1, { target: { value: "p1" } });

    rerender(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((screen.getByLabelText("선수 1") as HTMLSelectElement).value).toBe(
      "p1"
    );
  });

  it("loads players and submits a match result without an inputter field", async () => {
    const onClose = vi.fn();
    const onRecorded = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          challengeRange: 4,
          rematchCooldowns: [],
          players: [
            { id: "p1", name: "오준석", rank: 1 },
            { id: "p4", name: "이민우", rank: 4 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          message: "경기 결과가 반영되었습니다.",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={onClose}
        onRecorded={onRecorded}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "경기 결과 입력" })
    ).toBeDefined();
    expect(screen.queryByLabelText(/입력자/)).toBeNull();

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText("선수 2"), {
      target: { value: "p4" },
    });
    fireEvent.change(screen.getByLabelText("선수 1 점수"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("선수 2 점수"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 반영" }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/clubs/seoultech/matches",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    const postOptions = fetchMock.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(String(postOptions.body));

    expect(body).toMatchObject({
      player1Id: "p1",
      player2Id: "p4",
      player1Score: 4,
      player2Score: 6,
    });
    expect(body.sourceKey).toEqual(expect.any(String));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and shows a server validation message", async () => {
    const onClose = vi.fn();
    const onRecorded = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            challengeRange: 4,
            rematchCooldowns: [],
            players: [
              { id: "p1", name: "오준석", rank: 1 },
              { id: "p4", name: "이민우", rank: 4 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            ok: false,
            message: "동일 선수와는 2주 동안 재경기할 수 없습니다.",
          }),
        })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={onClose}
        onRecorded={onRecorded}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText("선수 2"), {
      target: { value: "p4" },
    });
    fireEvent.change(screen.getByLabelText("선수 1 점수"), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByLabelText("선수 2 점수"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 반영" }));

    expect(
      await screen.findByText("동일 선수와는 2주 동안 재경기할 수 없습니다.")
    ).toBeDefined();
    expect(onRecorded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("filters player 2 to four active ranks above and below player 1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(10),
          challengeRange: 4,
          rematchCooldowns: [],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p5" },
    });

    expect(optionValues("선수 2")).toEqual([
      "",
      "p1",
      "p2",
      "p3",
      "p4",
      "p6",
      "p7",
      "p8",
      "p9",
    ]);
  });

  it("filters player 1 when player 2 is selected first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(10),
          challengeRange: 4,
          rematchCooldowns: [],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 2"), {
      target: { value: "p6" },
    });

    expect(optionValues("선수 1")).toEqual([
      "",
      "p2",
      "p3",
      "p4",
      "p5",
      "p7",
      "p8",
      "p9",
      "p10",
    ]);
  });

  it("uses the challenge range returned by the match options API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(10),
          challengeRange: 2,
          rematchCooldowns: [],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p5" },
    });

    expect(optionValues("선수 2")).toEqual([
      "",
      "p3",
      "p4",
      "p6",
      "p7",
    ]);
  });

  it("uses active-player order when ranking numbers have gaps", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            { id: "p1", name: "선수1", rank: 1 },
            { id: "p3", name: "선수3", rank: 3 },
            { id: "p7", name: "선수7", rank: 7 },
            { id: "p11", name: "선수11", rank: 11 },
            { id: "p20", name: "선수20", rank: 20 },
            { id: "p21", name: "선수21", rank: 21 },
          ],
          challengeRange: 2,
          rematchCooldowns: [],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p7" },
    });

    expect(optionValues("선수 2")).toEqual([
      "",
      "p1",
      "p3",
      "p11",
      "p20",
    ]);
  });

  it("disables a cooldown opponent in player 2 after player 1 is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(10),
          challengeRange: 4,
          rematchCooldowns: [
            {
              playerAId: "p1",
              playerBId: "p4",
              availableOn: "2026-07-24",
            },
          ],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p1" },
    });

    const blocked = optionByValue("선수 2", "p4");
    expect(blocked.disabled).toBe(true);
    expect(blocked.textContent).toContain("7월 24일부터 가능");
  });

  it("disables a cooldown opponent in player 1 after player 2 is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(10),
          challengeRange: 4,
          rematchCooldowns: [
            {
              playerAId: "p1",
              playerBId: "p4",
              availableOn: "2026-07-24",
            },
          ],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 2"), {
      target: { value: "p4" },
    });

    const blocked = optionByValue("선수 1", "p1");
    expect(blocked.disabled).toBe(true);
    expect(blocked.textContent).toContain("7월 24일부터 가능");
  });

  it("describes in-range cooldown opponents and dates for each player select", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: rankedPlayers(4),
          challengeRange: 4,
          rematchCooldowns: [
            {
              playerAId: "p1",
              playerBId: "p4",
              availableOn: "2026-07-24",
            },
            {
              playerAId: "p2",
              playerBId: "p3",
              availableOn: "2026-07-25",
            },
          ],
        }),
      })
    );

    render(
      <MatchEntryDialog
        clubSlug="seoultech"
        open
        onClose={vi.fn()}
        onRecorded={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByLabelText("선수 1"), {
      target: { value: "p1" },
    });
    fireEvent.change(screen.getByLabelText("선수 2"), {
      target: { value: "p3" },
    });

    const player1 = screen.getByLabelText("선수 1");
    const player2 = screen.getByLabelText("선수 2");
    const player1DescriptionId = player1.getAttribute("aria-describedby");
    const player2DescriptionId = player2.getAttribute("aria-describedby");

    expect(player1DescriptionId).toBeTruthy();
    expect(player2DescriptionId).toBeTruthy();
    expect(player1DescriptionId).not.toBe(player2DescriptionId);

    const player1Description = document.getElementById(player1DescriptionId!);
    const player2Description = document.getElementById(player2DescriptionId!);

    expect(player1Description?.getAttribute("aria-live")).toBe("polite");
    expect(player2Description?.getAttribute("aria-live")).toBe("polite");
    expect(player1Description?.textContent).toContain(
      "2위 · 선수2 · 7월 25일부터 가능"
    );
    expect(player2Description?.textContent).toContain(
      "4위 · 선수4 · 7월 24일부터 가능"
    );
  });
});
