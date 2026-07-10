import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MatchEntryDialog from "./MatchEntryDialog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MatchEntryDialog", () => {
  it("does not reload or reset the form when callback identities change", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
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
});
