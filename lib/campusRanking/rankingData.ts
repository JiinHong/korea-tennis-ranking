import type {ClubConfig} from "@/lib/campusRanking/config";
import {getSpreadsheetId} from "@/lib/googleSheets/client";
import {getHistoricalMatchLogTable} from "@/lib/googleSheets/historicalMatches";
import {getMatchLogTable} from "@/lib/googleSheets/currentMatches";
import type {MatchRecord} from "@/lib/googleSheets/currentMatches";
import {buildPlayerDetails} from "@/lib/campusRanking/playerDetails";
import {getRankingTable} from "@/lib/googleSheets/currentRanking";
import type {RankingData} from "@/lib/googleSheets/currentRanking";
import type {PlayerStatus} from "@/lib/campusRanking/rules";

type RankingSourceTables = {
    currentSeasonName: string;
    ranking: RankingData[];
    matches: MatchRecord[];
    historicalMatches: Awaited<ReturnType<typeof getHistoricalMatchLogTable>>;
    rankChanges: Record<string, number>;
}

export type Player = {
    rank: number;
    name: string;
    note: string;
    rankChange: number;
    status?: PlayerStatus;
    wins: number;
    losses: number;
    matches: number;
    recent5: string[];
    recentForm?: RecentFormResult[];
}

export type RankingSummary = {
    totalMatches: number;
    recent30Matches: number;
}

export type RecentFormResult = {
    result: "W" | "L";
    season: string;
    isHistorical: boolean;
}

export type SeasonSummary = {
    name: string;
    matches: number;
    isCurrent: boolean;
}

function parseMatchDate(date: string): Date | null {
    const numbers = date.match(/\d+/g)?.map(Number) ?? [];
    const [year, month, day] = numbers;

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function getMatchResult(
    playerName: string,
    match: MatchRecord
): "W" | "L" | null {
    if (match.challenger !== playerName && match.defender !== playerName) {
        return null;
    }

    return match.winner === playerName ? "W" : "L";
}

function buildRecentForm(
    player: Player,
    historicalMatches: Awaited<ReturnType<typeof getHistoricalMatchLogTable>>,
    currentSeasonName: string
): RecentFormResult[] {
    const currentForm = player.recent5.slice(-5).map((result) => ({
        result: result === "W" ? "W" as const : "L" as const,
        season: currentSeasonName,
        isHistorical: false,
    }));
    const historicalLimit = Math.max(0, 5 - currentForm.length);

    const historicalForm = historicalMatches
        .map((match) => ({ match, result: getMatchResult(player.name, match) }))
        .filter(
            (entry): entry is {
                match: (typeof historicalMatches)[number];
                result: "W" | "L";
            } => entry.result !== null
        )
        .sort((a, b) => {
            const aTime = parseMatchDate(a.match.date)?.getTime() ?? 0;
            const bTime = parseMatchDate(b.match.date)?.getTime() ?? 0;

            return bTime - aTime;
        })
        .slice(0, historicalLimit)
        .reverse()
        .map(({ match, result }) => ({
            result,
            season: match.season,
            isHistorical: true,
        }));

    return [...historicalForm, ...currentForm];
}

function seasonSortValue(seasonName: string): number {
    const seasonNumber = seasonName.match(/\d+/)?.[0];

    return seasonNumber ? Number(seasonNumber) : Number.NEGATIVE_INFINITY;
}

function buildSeasonSummaries(
    currentSeasonName: string,
    matches: MatchRecord[],
    historicalMatches: Awaited<ReturnType<typeof getHistoricalMatchLogTable>>
): SeasonSummary[] {
    const historicalCounts = new Map<string, number>();

    for (const match of historicalMatches) {
        historicalCounts.set(
            match.season,
            (historicalCounts.get(match.season) ?? 0) + 1
        );
    }

    const historicalSummaries = Array.from(historicalCounts.entries())
        .sort(([a], [b]) => {
            return seasonSortValue(b) - seasonSortValue(a) || b.localeCompare(a);
        })
        .map(([name, matchCount]) => ({
            name,
            matches: matchCount,
            isCurrent: false,
        }));

    return [
        { name: currentSeasonName, matches: matches.length, isCurrent: true },
        ...historicalSummaries,
    ];
}

export function buildRankingSummary(
    matches: MatchRecord[],
    now = new Date()
): RankingSummary {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recentStart = new Date(today);
    recentStart.setDate(today.getDate() - 30);

    const recent30Matches = matches.filter((match) => {
        const matchDate = parseMatchDate(match.date);

        if (!matchDate) {
            return false;
        }

        return matchDate >= recentStart && matchDate <= today;
    }).length;

    return {
        totalMatches: matches.length,
        recent30Matches,
    };
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
    matches: MatchRecord[],
    rankChanges: Record<string, number> = {}
): Player[] {
    // Record는 파이썬으로 따지면 dict임.
    const stats: Record<string, Player> = {};

    for (const rankingData of ranking) {
        stats[rankingData.name] = {
            rank: rankingData.rank,
            name: rankingData.name,
            note: rankingData.note,
            rankChange: rankChanges[rankingData.name] ?? 0,
            ...(rankingData.status ? {status: rankingData.status} : {}),
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
    const summary = buildRankingSummary(matches);

    return {
        players,
        matches,
        summary,
    }
}

export async function getRankingDataForClub(club: ClubConfig) {
    const {currentSeasonName, ranking, matches, historicalMatches, rankChanges} =
        await getRankingSourceTables(club);
    const players = buildPlayer(ranking, matches, rankChanges);
    const playersWithRecentForm = players.map((player) => ({
        ...player,
        recentForm: buildRecentForm(
            player,
            historicalMatches,
            currentSeasonName
        ),
    }));
    const summary = buildRankingSummary(matches);
    const seasonSummaries = buildSeasonSummaries(
        currentSeasonName,
        matches,
        historicalMatches
    );
    const detailsByPlayer = buildPlayerDetails(
        players,
        matches,
        historicalMatches,
        currentSeasonName,
    );

    return {
        club,
        players: playersWithRecentForm,
        matches,
        summary,
        seasonSummaries,
        detailsByPlayer,
    };
}

async function getRankingSourceTables(club: ClubConfig): Promise<RankingSourceTables> {
    if (process.env.RANKING_DATA_SOURCE === "supabase") {
        const {getSupabaseRankingTables} = await import(
            "@/lib/supabase/rankingRepository"
        );

        return getSupabaseRankingTables(club.slug);
    }

    const spreadsheetId = getSpreadsheetId(club.sheetIdEnv);
    const ranking = await getRankingTable(spreadsheetId);
    const matches = await getMatchLogTable(spreadsheetId);
    const historicalMatches = club.historicalMatchLogRange
        ? await getHistoricalMatchLogTable(
            spreadsheetId,
            club.historicalMatchLogRange
        )
        : [];

    return {
        currentSeasonName: club.currentSeasonName,
        ranking,
        matches,
        historicalMatches,
        rankChanges: {},
    };
}
