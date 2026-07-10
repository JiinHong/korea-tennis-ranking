import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminPlayerClub } from "@/lib/supabaseAdminPlayers";

import AdminPlayerManager from "./AdminPlayerManager";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const clubs: AdminPlayerClub[] = [
  {
    id: "club-seoultech",
    slug: "seoultech",
    name: "서울과기대",
    title: "단식 랭킹",
    season: { id: "season-3", name: "시즌3" },
    players: [
      {
        seasonPlayerId: "sp-1",
        playerId: "player-1",
        name: "활동선수",
        initialRank: 1,
        currentRank: 1,
        note: "",
        status: "active",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: null,
      },
      {
        seasonPlayerId: "sp-2",
        playerId: "player-2",
        name: "부상선수",
        initialRank: 2,
        currentRank: 2,
        note: "손목",
        status: "injured",
        joinedAt: "2026-07-01T00:00:00Z",
        leftAt: null,
      },
    ],
  },
];

function successResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      ok: true,
      player: {
        action: "add",
        seasonPlayerId: "sp-3",
        playerId: "player-3",
        name: "새 선수",
        rank: 3,
        status: "active",
        ...overrides,
      },
    }),
  };
}

afterEach(() => {
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("AdminPlayerManager", () => {
  it("shows the secret field only after a sensitive action starts", () => {
    render(<AdminPlayerManager clubs={clubs} />);

    expect(screen.queryByLabelText("관리자 비밀키")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "선수 추가" }));

    expect(screen.getByRole("dialog", { name: "선수 추가" })).toBeDefined();
    expect(screen.getByLabelText("관리자 비밀키")).toBeDefined();
  });

  it("adds a player and refreshes server data without retaining the secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPlayerManager clubs={clubs} />);

    fireEvent.click(screen.getByRole("button", { name: "선수 추가" }));
    fireEvent.change(screen.getByLabelText("선수 이름"), {
      target: { value: "새 선수" },
    });
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/clubs/seoultech/players",
      expect.objectContaining({ method: "POST" })
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      name: "새 선수",
      adminSecret: "admin-secret",
    });
    expect(screen.queryByLabelText("관리자 비밀키")).toBeNull();
  });

  it("submits a rename with the selected season player", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successResponse({ action: "rename", name: "수정선수" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPlayerManager clubs={clubs} />);

    fireEvent.click(
      screen.getByRole("button", { name: "활동선수 이름 수정" })
    );
    fireEvent.change(screen.getByLabelText("선수 이름"), {
      target: { value: "수정선수" },
    });
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      operation: "rename",
      seasonPlayerId: "sp-1",
      name: "수정선수",
      adminSecret: "admin-secret",
    });
  });

  it("submits a status change with the selected player", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      successResponse({ action: "status", status: "inactive" })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPlayerManager clubs={clubs} />);

    fireEvent.click(
      screen.getByRole("button", { name: "활동선수 상태 변경" })
    );
    fireEvent.change(screen.getByLabelText("선수 상태"), {
      target: { value: "inactive" },
    });
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      operation: "status",
      seasonPlayerId: "sp-1",
      status: "inactive",
      adminSecret: "admin-secret",
    });
  });

  it("keeps a failed mutation open and shows the server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          message: "관리자 비밀키가 올바르지 않습니다.",
        }),
      })
    );
    render(<AdminPlayerManager clubs={clubs} />);

    fireEvent.click(screen.getByRole("button", { name: "선수 추가" }));
    fireEvent.change(screen.getByLabelText("선수 이름"), {
      target: { value: "새 선수" },
    });
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(
      await screen.findByText("관리자 비밀키가 올바르지 않습니다.")
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "선수 추가" })).toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("filters the current club roster by name or note", () => {
    render(<AdminPlayerManager clubs={clubs} />);

    fireEvent.change(screen.getByLabelText("선수 검색"), {
      target: { value: "손목" },
    });

    expect(screen.getByText("부상선수")).toBeDefined();
    expect(screen.queryByText("활동선수")).toBeNull();
  });
});
