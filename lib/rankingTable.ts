import {getSheetsClient, getSpreadsheetId} from "@/lib/googleSheets";
import {parseRank} from "@/lib/rank";

export type RankingData = {
    rank : number;
    name : string;
    note : string;
}

//구글 시트에서 랭킹 표를 읽어보는 함수
//promise는 나중에 결과가 나오는 값임
export async function getRankingTable(spreadsheetId = getSpreadsheetId()): Promise<RankingData[]> {

    // 시트 불러오기
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'실시간순위표'!A1:C100",
    });

    const rows = result.data.values ?? [];

    // 헤더를 찾아야함. '현재 순위', '이름' 그 아래부터 시작
    const headerRowIndex = rows.findIndex((row) => {
        return row[0] === '현재 순위' && row[1] === '이름';
    });

    // ===는 값과 타입이 모두 같아야함
    if (headerRowIndex === -1) {
        throw new Error('"현재 순위" 헤더를 찾지 못했습니다.');
    }

    // 그 아래부터 선수 순위 데이터
    const rankingRows = rows.slice(headerRowIndex + 1);

    const players: RankingData[] = [];

    for (const row of rankingRows) {
        const rankText = String(row[0] ?? '').trim();
        const rank = parseRank(rankText);
        const name = String(row[1] ?? '').trim();
        const note = String(row[2] ?? '').trim();

        if (!rankText || !name) {
            break;
        }

        if (rank === null) {
            break;
        }

        players.push({
            rank,
            name,
            note,
        });
    }

    return players;
}
