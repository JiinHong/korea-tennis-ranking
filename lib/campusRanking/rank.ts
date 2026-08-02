export function parseRank(rankText: string): number | null {
    //replace(/[^0-9]/g, "")는 숫자가 아닌 문자를 전부 제거한다.
    const numberText = rankText.replace(/[^0-9]/g, "");
    const rank = parseInt(numberText, 10);
    if (Number.isNaN(rank)) {
        return null;
    }
    return rank;
}