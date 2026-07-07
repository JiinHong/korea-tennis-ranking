import type {ClubConfig} from "@/lib/clubs";
import {getSpreadsheetId} from "@/lib/googleSheets";
import {getHistoricalMatchLogTable} from "@/lib/historicalMatchLogTable";
import {getMatchLogTable} from "@/lib/matchLogTable";
import type {MatchRecord} from "@/lib/matchLogTable";
import {buildPlayerDetails} from "@/lib/playerDetails";
import {getRankingTable} from "@/lib/rankingTable";
import type {RankingData} from "@/lib/rankingTable";

export type Player = {
    rank: number;
    name: string;
    note: string;
    wins: number;
    losses: number;
    matches: number;
    recent5: string[];
}

function win(player: Player): Player {
    return {
        ...player,
        wins: player.wins + 1,
        losses: player.losses,
        matches: player.matches + 1,
        recent5: [...player.recent5, "W"].slice(-5),
    };
}
function lose(player: Player): Player {
    return {
        ...player,
        wins: player.wins,
        losses: player.losses + 1,
        matches: player.matches + 1,
        recent5: [...player.recent5, "L"].slice(-5),
    };
}

export function buildPlayer(
    ranking: RankingData[],
    matches: MatchRecord[]
): Player[] {
    // Record는 파이썬으로 따지면 dict임.
    const stats: Record<string, Player> = {};

    for (const rankingData of ranking) {
        stats[rankingData.name] = {
            rank: rankingData.rank,
            name: rankingData.name,
            note: rankingData.note,
            wins: 0,
            losses: 0,
            matches: 0,
            recent5: [],
        };
    }

    for (const match of matches) {
        // 기록지의 이름이 실시간랭킹표에 없으면 continue
        // 나중에 중간 탈퇴자가 생기면 수정해야함
        if (!stats[match.challenger] || !stats[match.defender]) {
            continue;
        }
        if (match.winner === match.challenger) {
            stats[match.challenger] = win(stats[match.challenger]);
            stats[match.defender] = lose(stats[match.defender]);
        } else if (match.winner === match.defender) {
            stats[match.challenger] = lose(stats[match.challenger]);
            stats[match.defender] = win(stats[match.defender]);
        }
    }

    const players: Player[] = [];

    for (const player of ranking) {
        players.push(stats[player.name]);
    }

    return players;
}

export async function getRankingData() {
    const ranking = await getRankingTable();
    const matches = await getMatchLogTable();
    const players = buildPlayer(ranking, matches);

    return {
        players,
        matches
    }
}

export async function getRankingDataForClub(club: ClubConfig) {
    const spreadsheetId = getSpreadsheetId(club.sheetIdEnv);
    const ranking = await getRankingTable(spreadsheetId);
    const matches = await getMatchLogTable(spreadsheetId);
    const historicalMatches = await getHistoricalMatchLogTable(spreadsheetId);
    const players = buildPlayer(ranking, matches);
    const detailsByPlayer = buildPlayerDetails(
        players,
        matches,
        historicalMatches,
        "시즌3",
    );

    return {
        club,
        players,
        matches,
        detailsByPlayer,
    };
}
