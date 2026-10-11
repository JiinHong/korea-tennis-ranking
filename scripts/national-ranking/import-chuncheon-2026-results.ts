import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { NationalRankingDataset, TeamResultInput, TournamentStage } from "../../lib/nationalRanking/types";

// Read from every visible round of the two KTG gold-division draws on 2026-10-11.
// BYEs are excluded; first_match_loss means no played-match win, even after a BYE.
type Entrant = [name: string, club: string | null, label: string, stage: TournamentStage];
const men: Entrant[] = [
  ["경북대 KUTC  C", "kyungpook-kutc", "C", "first_match_loss"],
  ["가천대 타이브레이크 A", "gachon-tiebreak", "A", "round_of_64"],
  ["서강대A", "sogang-sgtc", "A", "champion"],
  ["단대치대A", "dankook-ace", "A", "round_of_32"],
  ["항공대 ACE 보라매", "kau-ace", "보라매", "first_match_loss"],
  ["성균관대 맹자", "sungkyunkwan-stc", "맹자", "first_match_loss"],
  ["카이스트 A", "kaist-stroke", "A", "round_of_16"],
  ["서울과학기술대학교 느티나무D", "seoultech-neutinamu", "D", "first_match_loss"],
  ["한밭대 마스터즈 B", "hanbat-masters", "B", "round_of_64"],
  ["가천대 타이브레이크 B", "gachon-tiebreak", "B", "first_match_loss"],
  ["동국대 DUTC 정진", "dongguk-dutc", "정진", "round_of_32"],
  ["경희대 오건일체", "kyunghee-kuta-lovice", "오건일체", "first_match_loss"],
  ["한림대 타이브레이크", "hallym-tiebreak", "", "first_match_loss"],
  ["가톨릭대학교 B", "catholic-courtrang", "B", "round_of_16"],
  ["서울대C", "seoul-university", "C", "round_of_64"],
  ["연세대 사랑", "yonsei-yutt", "사랑", "first_match_loss"],
  ["배재대 프리마A", "paichai-prima", "A", "first_match_loss"],
  ["연세대 정의", "yonsei-yutt", "정의", "round_of_64"],
  ["경희대 얼간이들", "kyunghee-kuta-lovice", "얼간이들", "round_of_32"],
  ["단국대(천안) DKUTC C", "dankook-cheonan-dkutc", "C", "first_match_loss"],
  ["경희대 러비스A", "kyunghee-kuta-lovice", "A", "first_match_loss"],
  ["명지대a", "myongji-mjta-mtc", "a", "quarterfinal"],
  ["아주대 ATC B", "ajou-tennis", "B", "first_match_loss"],
  ["경북대 KUTC B", "kyungpook-kutc", "B", "round_of_64"],
  ["성균관대 주자", "sungkyunkwan-stc", "주자", "first_match_loss"],
  ["연세대 쿠크다스 A", "yonsei-kookdas", "A", "round_of_32"],
  ["연세대 믿음", "yonsei-yutt", "믿음", "first_match_loss"],
  ["단국대(천안) DKUTC B", "dankook-cheonan-dkutc", "B", "round_of_64"],
  ["한남대 위너스 A", "hannam-winners", "A", "round_of_32"],
  ["전북대 ACE B", "jeonbuk-ace", "B", "first_match_loss"],
  ["성균관대 노자", "sungkyunkwan-stc", "노자", "first_match_loss"],
  ["연세대 자유", "yonsei-yutt", "자유", "round_of_16"],
  ["중앙대 U", "chungang-love4t", "U", "first_match_loss"],
  ["고려대학교 PETC B", "korea-petc", "B", "first_match_loss"],
  ["연세대 진리", "yonsei-yutt", "진리", "round_of_32"],
  ["한양대학교 HYTC A", "hanyang-hytc", "A", "first_match_loss"],
  ["서울대B", "seoul-university", "B", "round_of_64"],
  ["한국외대 B", "hufs-ace", "B", "first_match_loss"],
  ["고려대학교 KUTC A", "korea-kutc", "A", "quarterfinal"],
  ["서울과학기술대학교 느티나무A", "seoultech-neutinamu", "A", "semifinal"],
  ["DKUTC 범정", "dankook-jukjeon-dkutc", "범정", "first_match_loss"],
  ["단국대(죽전)DKUTC A", "dankook-jukjeon-dkutc", "A", "round_of_64"],
  ["고려대학교 KUTC B", "korea-kutc", "B", "first_match_loss"],
  ["한기대 SMASH", "koreatech-tennis", "", "first_match_loss"],
  ["고려대학교 KUTC C", "korea-kutc", "C", "round_of_64"],
  ["한밭대 마스터즈 A", "hanbat-masters", "A", "round_of_32"],
  ["단국대(천안) DKUTC A", "dankook-cheonan-dkutc", "A", "first_match_loss"],
  ["경기대학교 KTF A", "gyeonggi-ktf", "A", "round_of_16"],
  ["경희대 러비스D", "kyunghee-kuta-lovice", "D", "first_match_loss"],
  ["중앙대 A", "chungang-love4t", "A", "first_match_loss"],
  ["건국대 KTC B", "konkuk-ktc", "B", "round_of_64"],
  ["울산대학교UTC", "ulsan-utc", "", "round_of_32"],
  ["세종대 stc b", "sejong-stc", "b", "first_match_loss"],
  ["서울대A", "seoul-university", "A", "runner_up"],
  ["한양대에리카A", "hanyang-erica-hitec", "A", "round_of_64"],
  ["성균관대 순자", "sungkyunkwan-stc", "순자", "first_match_loss"],
  ["한양대에리카B", "hanyang-erica-hitec", "B", "round_of_64"],
  ["강원대 백령 B", "kangwon-baekryeong", "B", "first_match_loss"],
  ["건국대 KTC A", "konkuk-ktc", "A", "round_of_32"],
  ["아주대 ATC A", "ajou-tennis", "A", "round_of_32"],
  ["카이스트 B", "kaist-stroke", "B", "first_match_loss"],
  ["상지대 ace A", "sangji-ace", "A", "first_match_loss"],
  ["고려대학교 PETC A", "korea-petc", "A", "round_of_64"],
  ["한양대에리카C", "hanyang-erica-hitec", "C", "round_of_64"],
  ["아주대 ATC C", "ajou-tennis", "C", "first_match_loss"],
  ["시립대 B", "uos-approach", "B", "round_of_16"],
  ["경북대 KUTC A", "kyungpook-kutc", "A", "quarterfinal"],
  ["동국대 DUTC 자비", "dongguk-dutc", "자비", "first_match_loss"],
  ["충남대 굿샷 흑마", "chungnam-goodshot", "흑마", "first_match_loss"],
  ["금오공대 KOTC", "kumoh-kotc", "", "round_of_64"],
  ["연세대 지혜", "yonsei-yutt", "지혜", "first_match_loss"],
  ["세종대 STC A", "sejong-stc", "A", "round_of_32"],
  ["아주대 ATC D", "ajou-tennis", "D", "first_match_loss"],
  ["상명대 테슬라", "sangmyung-tesla", "", "round_of_64"],
  ["연세대 치대 사랑니", "yonsei-yutt", "사랑니", "first_match_loss"],
  ["항공대 ACE 송골매", "kau-ace", "송골매", "round_of_32"],
  ["한국외대 A", "hufs-ace", "A", "round_of_16"],
  ["중앙대C", "chungang-love4t", "C", "first_match_loss"],
  ["성균관대 공자", "sungkyunkwan-stc", "공자", "first_match_loss"],
  ["시립대 A", "uos-approach", "A", "round_of_32"],
  ["한양대학교 HYTC C", "hanyang-hytc", "C", "round_of_64"],
  ["연세대 평화", "yonsei-yutt", "평화", "first_match_loss"],
  ["인천대A", "inu-uitc", "A", "first_match_loss"],
  ["강원대 백령 A", "kangwon-baekryeong", "A", "quarterfinal"],
  ["아주대 ATC E", "ajou-tennis", "E", "first_match_loss"],
  ["서울대 PnC", "seoul-university", "", "first_match_loss"],
  ["홍익대 HITC A", "hongik-hitc", "A", "round_of_16"],
  ["서강대B", "sogang-sgtc", "B", "first_match_loss"],
  ["서울대학교 IMPACT", "seoul-social-impact", "", "round_of_64"],
  ["건국대 KTC C", "konkuk-ktc", "C", "round_of_32"],
  ["한밭대 마스터즈 C", "hanbat-masters", "C", "first_match_loss"],
  ["경기대 새싹", "gyeonggi-ktf", "새싹", "first_match_loss"],
  ["충남대 굿샷 백마", "chungnam-goodshot", "백마", "round_of_32"],
  ["서울과학기술대학교 느티나무C", "seoultech-neutinamu", "C", "round_of_64"],
  ["경희대 러비스C", "kyunghee-kuta-lovice", "C", "first_match_loss"],
  ["서울과학기술대학교 느티나무b", "seoultech-neutinamu", "b", "round_of_64"],
  ["건국대 KTC D", "konkuk-ktc", "D", "first_match_loss"],
  ["전북대 ace a", "jeonbuk-ace", "a", "semifinal"],
  ["연세대 쿠크다스 B", "yonsei-kookdas", "B", "first_match_loss"],
  ["수원대 ACE", "suwon-ace", "", "round_of_64"],
  ["가톨릭대학교 A", "catholic-courtrang", "A", "first_match_loss"],
  ["전북대 탑스핀", "jeonbuk-topspin", "", "round_of_16"],
  ["강원대(SHOT)", "gangwon-shot", "", "first_match_loss"],
  ["충북대A", "chungbuk-ace", "A", "round_of_64"],
  ["명지대B", "myongji-mjta-mtc", "B", "first_match_loss"],
  ["한양대학교 HYTC B", "hanyang-hytc", "B", "round_of_32"],
];

const women: Entrant[] = [
  ["한양대학교 HYTC A", "hanyang-hytc", "A", "semifinal"],
  ["한양대학교 HYTC B", "hanyang-hytc", "B", "round_of_32"],
  ["연세대 평화", "yonsei-yutt", "평화", "first_match_loss"],
  ["홍익대 HITC B", "hongik-hitc", "B", "first_match_loss"],
  ["DKUTC", "dankook-cheonan-dkutc", "", "round_of_16"],
  ["한남대학교 위너스A", "hannam-winners", "A", "first_match_loss"],
  ["경희대러비스A", "kyunghee-kuta-lovice", "A", "quarterfinal"],
  ["서울과기대 느티나무B", "seoultech-neutinamu", "B", "first_match_loss"],
  ["한양대에리카A", "hanyang-erica-hitec", "A", "round_of_32"],
  ["성균관대 맹자", "sungkyunkwan-stc", "맹자", "first_match_loss"],
  ["아주대 ATC B", "ajou-tennis", "B", "first_match_loss"],
  ["가톨릭대 A", "catholic-courtrang", "A", "round_of_32"],
  ["전북대 ACE", "jeonbuk-ace", "", "round_of_16"],
  ["충남대 굿샷B", "chungnam-goodshot", "B", "first_match_loss"],
  ["이화여대 이화테니스 A", "ewha-tennis", "A", "round_of_32"],
  ["서울대A", "seoul-university", "A", "quarterfinal"],
  ["충남대 굿샷A", "chungnam-goodshot", "A", "round_of_16"],
  ["인천대 UITC A", "inu-uitc", "A", "first_match_loss"],
  ["아주대 ATC A", "ajou-tennis", "A", "round_of_32"],
  ["단국대(천안) DKUTC A", "dankook-cheonan-dkutc", "A", "first_match_loss"],
  ["한양대에리카B", "hanyang-erica-hitec", "B", "round_of_32"],
  ["경희대러비스 C", "kyunghee-kuta-lovice", "C", "first_match_loss"],
  ["한국외대", "hufs-ace", "", "round_of_16"],
  ["연세대 진리", "yonsei-yutt", "진리", "champion"],
  ["아주대 ATC C", "ajou-tennis", "C", "first_match_loss"],
  ["중앙대A", "chungang-love4t", "A", "first_match_loss"],
  ["항공대", "kau-ace", "", "quarterfinal"],
  ["건국대A", "konkuk-ktc", "A", "round_of_32"],
  ["단국대(천안) DKUTC B", "dankook-cheonan-dkutc", "B", "first_match_loss"],
  ["연세대 쿠크다스 A", "yonsei-kookdas", "A", "first_match_loss"],
  ["서강대B", "sogang-sgtc", "B", "round_of_16"],
  ["경희대러비스B", "kyunghee-kuta-lovice", "B", "first_match_loss"],
  ["서울과기대 느티나무 A", "seoultech-neutinamu", "A", "runner_up"],
  ["가천대 타이브레이크 A", "gachon-tiebreak", "A", "round_of_32"],
  ["세종대학교 STC A", "sejong-stc", "A", "first_match_loss"],
  ["이화여대 스매시", "ewha-smash", "", "round_of_16"],
  ["연세대 정의", "yonsei-yutt", "정의", "first_match_loss"],
  ["동국대 DUTC", "dongguk-dutc", "", "first_match_loss"],
  ["수원대 ACE", "suwon-ace", "", "round_of_32"],
  ["서강대A", "sogang-sgtc", "A", "quarterfinal"],
  ["고려대학교 PETC", "korea-petc", "", "round_of_32"],
  ["고려대 KUTC B", "korea-kutc", "B", "first_match_loss"],
  ["전북대 탑스핀", "jeonbuk-topspin", "", "round_of_16"],
  ["연세대 자유", "yonsei-yutt", "자유", "round_of_32"],
  ["강원대", "kangwon-baekryeong", "", "first_match_loss"],
  ["성균관대 공자", "sungkyunkwan-stc", "공자", "first_match_loss"],
  ["배재대 프리마 A", "paichai-prima", "A", "round_of_32"],
  ["한밭대 마스터즈 A", "hanbat-masters", "A", "first_match_loss"],
  ["경희대 KUTA", "kyunghee-kuta-lovice", "", "round_of_16"],
  ["홍익대 HITC A", "hongik-hitc", "A", "first_match_loss"],
  ["고려대학교 KUTC A", "korea-kutc", "A", "semifinal"],
  ["이화여대 이화테니스B", "ewha-tennis", "B", "first_match_loss"],
];

const confirmedNotes: Record<string, string> = {
  "단대치대A": "관리자 확인에 따라 단국대학교 치과대학 ACE로 배정했습니다.",
  "서울대 PnC": "관리자 확인에 따라 서울대학교 테니스부로 배정했습니다.",
  "서울대학교 IMPACT": "관리자 확인에 따라 별도 동아리 서울대학교 사회대학 IMPACT로 배정했습니다.",
  "강원대": "관리자 확인에 따라 강원대학교 백령으로 배정했습니다.",
  "강원대(SHOT)": "관리자 확인에 따라 강원대학교 삼척캠퍼스 SHOT으로 배정했습니다.",
};

function toResult(editionKey: string, sourceRef: string, entrant: Entrant): TeamResultInput {
  const [sourceTeamName, clubSlug, teamLabel, stage] = entrant;
  let note = "2026-10-10 춘천소양강배 대학부 금배부의 전체 본선 라운드를 2026-10-11 확인해 마지막 진출 단계를 기록했습니다. 부전승은 실제 경기 승수에 포함하지 않았습니다.";
  if (confirmedNotes[sourceTeamName]) note += ` ${confirmedNotes[sourceTeamName]}`;
  if (sourceTeamName === "연세대 치대 사랑니") note += "관리자 확인에 따라 연세대 치대 성적을 YUTT에 포함했습니다.";
  if (sourceTeamName === "DKUTC" || sourceTeamName === "DKUTC 범정") note += "기존 승인된 캠퍼스 미표기 DKUTC 배정 규칙(여자 천안·남자 죽전)을 적용했습니다.";
  if (stage === "champion") note += editionKey === "chuncheon-2026-men" ? " 결승: 서강대A 2-1 서울대A." : " 결승: 연세대 진리 2-1 서울과기대 느티나무 A.";
  return { editionKey, clubSlug, sourceTeamName, teamLabel, stage, qualityStatus: clubSlug === null ? "unresolved" : "verified", sourceRef, note };
}

const path = resolve("data/national-ranking/v1/dataset.json");
const dataset = JSON.parse(readFileSync(path, "utf8")) as NationalRankingDataset;
if (dataset.version !== "sources-2026-09-13-v21" || dataset.editions.some((edition) => edition.key.startsWith("chuncheon-2026-"))) {
  throw new Error("Expected v21 without 2026 Chuncheon; refusing to reapply the one-time import.");
}
if (men.length !== 106 || women.length !== 52) throw new Error("Chuncheon entrant count mismatch.");
dataset.version = "sources-2026-10-11-v22";
dataset.clubs.push({
  slug: "seoul-social-impact",
  universityName: "서울대학교 사회대학",
  clubName: "IMPACT",
  displayName: "서울대학교 사회대학 IMPACT",
});
const baekryeong = dataset.clubs.find((club) => club.slug === "kangwon-baekryeong");
if (!baekryeong) throw new Error("Missing existing Kangwon club.");
baekryeong.clubName = "백령";
baekryeong.displayName = "강원대학교 백령";
for (const result of dataset.results) {
  if (result.sourceTeamName === "단대치대 A") {
    result.clubSlug = "dankook-ace";
    result.qualityStatus = "verified";
    result.note += " 관리자 확인에 따라 단국대학교 치과대학 ACE로 배정했습니다.";
  }
}
for (const [clubSlug, sourceLabel] of [
  ["dankook-ace", "단대치대A"],
  ["dankook-ace", "단대치대 A"],
  ["seoul-university", "서울대 PnC"],
  ["seoul-social-impact", "서울대학교 IMPACT"],
  ["kangwon-baekryeong", "강원대"],
  ["gangwon-shot", "강원대(SHOT)"],
]) {
  const club = dataset.clubs.find((candidate) => candidate.slug === clubSlug);
  if (!club) throw new Error(`Missing confirmed club: ${clubSlug}`);
  const normalizedAlias = `${club.universityName} ${sourceLabel}`.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  if (dataset.aliases.some((alias) => alias.normalizedAlias === normalizedAlias)) {
    throw new Error(`Confirmed alias already exists: ${normalizedAlias}`);
  }
  dataset.aliases.push({ clubSlug, normalizedAlias, sourceLabel });
}
const lastChuncheonIndex = dataset.editions.findLastIndex((edition) => edition.tournamentSlug === "chuncheon");
for (const [offset, gender, entrants, draw] of [[1, "men", men, "978"], [2, "women", women, "980"]] as const) {
  const key = `chuncheon-2026-${gender}`;
  const sourceRef = `https://www.tennisgame.co.kr/dashboard/onair/tm/415/${draw}`;
  dataset.editions.splice(lastChuncheonIndex + offset, 0, { key, tournamentSlug: "chuncheon", year: 2026, gender, actualEntrants: entrants.length, sourceStatus: "verified", sourceRefs: [sourceRef] });
  dataset.results.push(...entrants.map((entrant) => toResult(key, sourceRef, entrant)));
}
writeFileSync(path, `${JSON.stringify(dataset, null, 2)}\n`);
console.log("Imported 158 verified Chuncheon 2026 results and the confirmed club identities.");
