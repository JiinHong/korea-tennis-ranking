import Link from "next/link";

import { createMethodologyMetadata } from "@/lib/analytics/pageMetadata";
import {
  getRecencyUnits,
  NATIONAL_FORMULA_V10,
} from "@/lib/nationalRanking/formula";

import MethodologyTableRegion from "./_components/MethodologyTableRegion";

export const metadata = createMethodologyMetadata();

const STAGE_ROWS = [
  ["우승", "champion"],
  ["준우승", "runner_up"],
  ["4강", "semifinal"],
  ["8강", "quarterfinal"],
  ["16강", "round_of_16"],
  ["32강", "round_of_32"],
  ["64강", "round_of_64"],
  ["실제로 치른 첫 경기 패배", "first_match_loss"],
] as const;

const COMPETITION_PRESTIGE_ROWS = [
  ["국토정중앙배(양구)", "1등급", 6],
  ["춘천소양강배", "2등급", 5],
  ["경인지구 연맹전", "3등급", 4],
  ["하늘내린인제", "3등급", 4],
  ["영월 전국대학 동아리 테니스 대회", "3등급", 4],
] as const;

const RECENCY_ROWS = [
  ["최신 개최연도", 0],
  ["1년 전", 1],
  ["2년 전", 2],
  ["그 이전", 3],
] as const;

const REFERENCE_LINKS = [
  {
    label: "ATP 랭킹 점수표",
    description: "2026 ATP 메인 드로 진출 단계 간 점수 관계",
    href: "https://www.atptour.com/en/rankings/rankings-faq",
  },
  {
    label: "BWF 세계 랭킹 시스템",
    description: "대회 등급과 성적을 결합하는 국제 종목 랭킹 사례",
    href: "https://system.bwfbadminton.com/documents/folder_1_81/folder_1_82/New-Regulations-2018/5.3.3.1%20World%20Ranking%20System.pdf",
  },
  {
    label: "UEFA 클럽 랭킹",
    description: "여러 시즌의 클럽 성과를 집계하는 랭킹 사례",
    href: "https://www.uefa.com/nationalassociations/uefarankings/",
  },
  {
    label: "solved.ac 도움말 UX 참고",
    description: "공개 산정 방식을 읽기 쉽게 설명하는 문서 구조 참고",
    href: "https://help.solved.ac/ko/stats/ac-rating",
  },
] as const;

export default function MethodologyPage() {
  return (
    <main className="methodology-page">
      <article className="methodology-document">
        <Link className="methodology-back-link" href="/">
          <span aria-hidden="true">←</span>
          전국 랭킹으로 돌아가기
        </Link>

        <header className="methodology-header">
          <p className="methodology-kicker">전국 대학 테니스 동아리 랭킹</p>
          <h1>랭킹 계산 방식</h1>
          <p>
            공개된 단체전 성적을 어떤 기준으로 점수화하는지 설명합니다.
          </p>
        </header>

        <section className="methodology-section" aria-labelledby="metric-title">
          <h2 id="metric-title">지표 정의</h2>
          <p>
            랭킹의 대상은 대학이 아니라 개별 테니스 동아리입니다. 점수는
            <strong> 동아리·부문·대회·개최 연도</strong> 조합별로 계산하며,
            검증된 단체전 성적만 반영합니다.
          </p>
          <p>
            대회별 점수를 합산해 동아리의 남자부 또는 여자부 총점을 구합니다.
            모든 가중치와 진출 단계 점수가 정수이므로 최종 점수도 정수로
            계산하며, 별도의 반올림은 사용하지 않습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="formula-title">
          <h2 id="formula-title">공식</h2>
          <p>
            진출 성적에 따른 기본 점수에 대회 위상과 개최 연도 가중치를 곱해
            대회 점수를 계산합니다.
          </p>
          <div className="methodology-formula" role="note">
            <code>
              대회 점수 = 진출 단계 점수 × 대회 위상 가중치 × 연도 가중치
            </code>
          </div>
          <p>
            동아리의 부문별 총점은 반영 대상이 된 모든 대회 점수의 합입니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="stage-title">
          <h2 id="stage-title">진출 단계 점수</h2>
          <p>
            우승과 깊은 진출을 더 크게 보상하되 점수가 지나치게 커지지 않도록
            단계별 점수를 작은 정수로 정했습니다. 부전승은 승리로 세지 않습니다.
          </p>
          <MethodologyTableRegion label="진출 단계별 점수">
            <table className="methodology-table">
              <caption>진출 단계별 점수</caption>
              <thead>
                <tr>
                  <th scope="col">최종 성적</th>
                  <th scope="col">단계 점수</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_ROWS.map(([label, stage]) => (
                  <tr key={stage}>
                    <th scope="row">{label}</th>
                    <td>{NATIONAL_FORMULA_V10.stageUnits[stage]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MethodologyTableRegion>
          <p className="methodology-note">
            부전승 뒤 실제로 치른 첫 경기에서 패하면 0점입니다. 공식 대진에서
            확인된 진출 단계까지만 인정합니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="prestige-title">
          <h2 id="prestige-title">대회 위상 가중치</h2>
          <p>
            전국·지역이라는 명칭만으로 일괄 감점하지 않고, 대학 동아리 대회로서의
            권위와 축적된 역사를 반영해 대회별 가중치를 적용합니다. 양구는
            1등급, 춘천은 2등급, 경인지구와 인제, 영월은 3등급으로 구분합니다.
          </p>
          <MethodologyTableRegion label="대회 위상별 가중치">
            <table className="methodology-table">
              <caption>대회 위상별 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">대회</th>
                  <th scope="col">등급</th>
                  <th scope="col">가중치</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITION_PRESTIGE_ROWS.map(([competition, prestige, factor]) => (
                  <tr key={competition}>
                    <th scope="row">{competition}</th>
                    <td>{prestige}</td>
                    <td>{factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MethodologyTableRegion>
        </section>

        <section className="methodology-section" aria-labelledby="recency-title">
          <h2 id="recency-title">연도 가중치</h2>
          <p>
            각 대회·성별의 가장 최근 개최연도를 기준으로 최신 개최연도는 연도
            가중치 4, 1년 전은 2, 2년 전은 1로 반영합니다. 그 이전 성적은
            현재 점수에서 제외합니다.
          </p>
          <MethodologyTableRegion label="대회별 연도 가중치">
            <table className="methodology-table">
              <caption>대회별 연도 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">기간</th>
                  <th scope="col">가중치</th>
                </tr>
              </thead>
              <tbody>
                {RECENCY_ROWS.map(([label, age]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>
                      {getRecencyUnits(2026, 2026 - age, NATIONAL_FORMULA_V10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MethodologyTableRegion>
          <p className="methodology-note">
            존재하지 않았던 대회 연도에는 결과 행을 만들지 않으며 불참으로
            간주하지 않습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="teams-title">
          <h2 id="teams-title">A/B/C팀 처리</h2>
          <p>
            같은 동아리가 같은 대회·연도·부문에 A/B/C팀으로 참가하면 가장 좋은
            성적 한 팀만 점수에 반영합니다.
          </p>
          <p>
            나머지 팀은 점수를 더하지도, 가장 좋은 팀의 점수를 낮추지도
            않습니다. A/B/C 외에 자유·정의·진리처럼 고유 팀명을 사용해도 같은
            동아리임이 확인되면 하나의 동아리 식별자로 통합합니다.
          </p>
          <p>
            결과에 학교명만 남아 동아리명이 없는 경우에는 같은 학교의 기존
            동아리 중 사전 산정 점수가 가장 높은 동아리에 한 번 배정하고, 그
            배정 결과를 데이터에 고정해 순환 계산을 막습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="honors-title">
          <h2 id="honors-title">수상 기록</h2>
          <p>
            랭킹표의 왕관은 최근 1년 범위에서 각 대회·부문별 최신 완료 회차의
            우승·준우승·4강 기록만 표시합니다. 원자료의 이전 수상 기록은
            삭제하지 않고 보존합니다.
          </p>
          <p>
            금색 왕관은 우승, 은색 왕관은 준우승, 동색 왕관은 4강 진출을
            뜻합니다. 전체 수상 기록은 동아리별 성적 상세 페이지에서 확인할 수
            있습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="division-title">
          <h2 id="division-title">남자부·여자부·종합</h2>
          <p>
            남자부와 여자부 랭킹은 각각 독립된 주요 랭킹이며, 종합 랭킹은
            남자부 점수와 여자부 점수를 더한 보조 랭킹입니다.
          </p>
          <p>
            한 부문의 결과가 다른 부문의 점수에 영향을 주지 않으며, 종합
            순위만 두 부문의 합계를 사용합니다.
          </p>
          <h3 className="methodology-subheading">동점 처리</h3>
          <ol aria-label="동점 처리 기준" className="methodology-tiebreakers">
            <li>최신 연도 대회에서 얻은 점수가 더 높은 동아리</li>
            <li>한 대회에서 얻은 최고 점수가 더 높은 동아리</li>
            <li>우승 횟수가 더 많은 동아리</li>
            <li>준우승 횟수가 더 많은 동아리</li>
            <li>동아리 표시 이름의 가나다순</li>
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="example-title">
          <h2 id="example-title">계산 예시</h2>
          <ol className="methodology-examples">
            <li>
              <span>최신 개최연도 국토정중앙배(양구) 우승</span>
              <code>21 × 6 × 4 = 504점</code>
            </li>
            <li>
              <span>1년 전 같은 대회 우승</span>
              <code>21 × 6 × 2 = 252점</code>
            </li>
            <li>
              <span>최신 개최연도 경인지구 연맹전 준우승</span>
              <code>13 × 4 × 4 = 208점</code>
            </li>
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="references-title">
          <h2 id="references-title">공식 참고 자료</h2>
          <p>
            산정 구조와 원자료 확인에 사용한 공식 문서 및 공개 설명 방식의 참고
            자료입니다.
          </p>
          <ul className="methodology-references">
            {REFERENCE_LINKS.map((reference) => (
              <li key={reference.href}>
                <a
                  href={reference.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {reference.label}
                </a>
                <span>{reference.description}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
