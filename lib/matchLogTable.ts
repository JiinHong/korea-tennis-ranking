// "@/lib/googleSheets"는 프로젝트에서 lib/googlesheets.ts 파일을 의미한다.
// tsconfig.json에 경로 별칭(alias)이 설정되어 있어서 "@/..." 형태로 import할 수 있다.

// getSheetsClients: Google Sheets API에 요청을 보낼 수 있는 클라이언트를 만들어주는 함수
// spreadsheetId: .env.local 또는 Vercel 환경변수에서 읽어온 Google Sheet ID.

import {getSheetsClient, getSpreadsheetId} from "@/lib/googleSheets";

import {parseRank} from "@/lib/rank";

// export type은 "이 타입을 다른 파일에서도 import해서 쓸 수 있게 공개한다"는 뜻이다.
export type MatchRecord = {
    date: string;
    challenger: string;
    challengerRank: number | null;
    defender: string;
    defenderRank: number | null;
    winner: string;
    score: string;
    defenseResult: string;
};


// async: 이 함수 안에서 await를 쓸 수 있다는 뜻.
// Google Sheets API 요청은 네트워크 작업이라 바로 결과가 오지 않음.

// Promise<MatchRecord[]>: 지금 당장 MatchRecord[]를 반환하는 게 아니라,
// "나중에 MatchRecord[]가 될 값"을 반환한다는 뜻.
// 쉽게 말하면 getMatchLogTable()을 호출하면 Google Sheets 응답을 기다린 뒤 경기 기록 배열을 돌려준다.
export async function getMatchLogTable(spreadsheetId = getSpreadsheetId()): Promise<MatchRecord[]> {
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'경기 기록지'!A1:H1000",
    });

    const rows = result.data.values ?? [];

    const headerRowIndex = rows.findIndex((row) => {
        const challengerHeader = String(row[1] ?? "").trim();
        const defenderHeader = String(row[3] ?? "").trim();
        const winnerHeader = String(row[5] ?? "").trim();

        return (
            challengerHeader.startsWith("도전자") &&
            defenderHeader.startsWith("방어자") &&
            winnerHeader === "승자"
        );
    });

    // header를 못찾으면 -1이 들어감.
    if (headerRowIndex === -1) {
        throw new Error('"경기 기록지" 헤더를 찾지 못했습니다');
    }

    const matchRows = rows.slice(headerRowIndex + 1);

    const matches: MatchRecord[] = [];

    for (const row of matchRows) {
        const date = String(row[0] ?? "").trim();
        const challenger = String(row[1] ?? "").trim();
        const challengerRankText = String(row[2] ?? "").trim();
        const defender: string = String(row[3] ?? "").trim();
        const defenderRankText = String(row[4] ?? "").trim();
        const winner = String(row[5] ?? "").trim();
        const score = String(row[6] ?? "").trim();
        const defenseResult = String(row[7] ?? "").trim();

        // 도전자나 방어자가 없으면 정상적인 경기 기록이 아니라고 보고 건너뛴다.
        if (!challenger || !defender) {
            continue;
        }

        matches.push({
            date: date,
            challenger: challenger,
            challengerRank: parseRank(challengerRankText),
            defender: defender,
            defenderRank: parseRank(defenderRankText),
            winner: winner,
            score,
            defenseResult,
        });
    }

    return matches;
}
