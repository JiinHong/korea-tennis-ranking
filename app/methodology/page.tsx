import Link from "next/link";

import {
  getFieldSizeUnits,
  getRecencyUnits,
  NATIONAL_FORMULA_V3,
} from "@/lib/nationalRanking/formula";

import MethodologyTableRegion from "./MethodologyTableRegion";

const FORMULA_EFFECTIVE_ON = "2026-07-13";

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
  ["국토정중앙배(양구)", "최상위", 3],
  ["경인지구 연맹전", "주요", 2],
  ["춘천소양강배", "주요", 2],
  ["WEMIX OPEN", "신흥", 1],
  ["하늘내린인제", "신흥", 1],
] as const;

const FIELD_SIZE_ROWS = [
  ["1~12팀", 12],
  ["13~31팀", 31],
  ["32~63팀", 63],
  ["64팀 이상", 64],
] as const;

const RECENCY_ROWS = [
  ["최신 대회", 0],
  ["직전 대회", 1],
  ["두 번째 이전 대회", 2],
  ["그보다 오래된 대회", 3],
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
    label: "OWGR 랭킹 방식",
    description: "대회 성적과 참가 규모를 다루는 골프 랭킹 사례",
    href: "https://www.owgr.com/how-the-ranking-works",
  },
  {
    label: "UEFA 클럽 랭킹",
    description: "여러 시즌의 클럽 성과를 집계하는 랭킹 사례",
    href: "https://www.uefa.com/nationalassociations/uefarankings/",
  },
  {
    label: "WEMIX OPEN 2025 공식 대회 요강",
    description: "2025 대회의 공식 참가 규모 확인 자료",
    href: "https://wepublic.blob.core.windows.net/wemix-open/overview/contest_overview.pdf",
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
            공개된 단체전 성적을 어떤 기준으로 점수화하는지, 같은 원자료로
            누구나 결과를 다시 계산할 수 있도록 설명합니다.
          </p>
        </header>

        <section className="methodology-section" aria-labelledby="metric-title">
          <h2 id="metric-title">지표 정의</h2>
          <p>
            랭킹의 대상은 대학이 아니라 개별 테니스 동아리입니다. 점수의 한
            단위는 <strong>동아리·부문·대회·개최 연도</strong>이며, 검증된
            단체전 성적만 계산합니다.
          </p>
          <p>
            각 단위의 대회 점수를 합산해 동아리의 남자부 또는 여자부 점수를
            구합니다. 모든 입력과 중간 계산, 최종 점수는 정수이며 소수점 반올림을
            사용하지 않습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="formula-title">
          <h2 id="formula-title">공식</h2>
          <p>검증된 각 대회 성적에는 아래 네 요소를 곱합니다.</p>
          <div className="methodology-formula" role="note">
            <code>
              대회 점수 = 진출 단계 단위 × 대회 위상 단위 × 참가 규모 단위 ×
              최신 대회 단위
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
            단계 간 관계를 작은 정수 단위로 압축했습니다. 부전승은 승리로 세지
            않습니다.
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
                    <td>{NATIONAL_FORMULA_V3.stageUnits[stage]}</td>
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
            권위와 축적된 역사를 반영해 대회별 가중치를 적용합니다. 양구를 최상위로,
            경인지구와 춘천을 주요 대회로, 역사가 짧은 위믹스와 인제를 신흥 대회로
            구분합니다.
          </p>
          <MethodologyTableRegion label="대회 위상별 가중치">
            <table className="methodology-table">
              <caption>대회 위상별 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">대회</th>
                  <th scope="col">위상</th>
                  <th scope="col">단위</th>
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

        <section className="methodology-section" aria-labelledby="field-title">
          <h2 id="field-title">참가 규모 가중치</h2>
          <p>
            N은 해당 연도와 부문에서 실제 참가한 팀 수입니다. 부전승과 경기 전
            기권 팀은 제외하며, 참가 규모를 네 구간의 정수 단위로 나눕니다.
          </p>
          <MethodologyTableRegion label="참가 팀 수별 기준 가중치">
            <table className="methodology-table">
              <caption>참가 팀 수별 기준 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">실제 참가 팀 수</th>
                  <th scope="col">단위</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_SIZE_ROWS.map(([label, entrants]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{getFieldSizeUnits(entrants)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MethodologyTableRegion>
        </section>

        <section className="methodology-section" aria-labelledby="recency-title">
          <h2 id="recency-title">연도 가중치</h2>
          <p>
            최신 대회는 대회마다 독립적으로 판단합니다. 가장 최근 개최 연도부터
            세 개 연도만 3, 2, 1 단위로 반영하며 그보다 오래된 성적은 현재
            점수에서 제외합니다.
          </p>
          <MethodologyTableRegion label="대회별 연도 가중치">
            <table className="methodology-table">
              <caption>대회별 연도 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">대회 내 순서</th>
                  <th scope="col">단위</th>
                </tr>
              </thead>
              <tbody>
                {RECENCY_ROWS.map(([label, age]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{getRecencyUnits(2026, 2026 - age)}</td>
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
            랭킹표의 왕관은 2025년 대회 우승과 준우승 기록만 표시합니다.
            원자료의 이전 수상 기록은 삭제하지 않고 보존합니다.
          </p>
          <p>
            금색 왕관은 우승, 은색 왕관은 준우승을 뜻합니다. 이전 연도의 수상
            기록은 현재 점수나 동점 처리 횟수에는 더해지지 않으며, 해당 대회와
            연도, 부문을 확인할 수 있도록 원자료에만 유지합니다.
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
              <span>최신 94팀 국토정중앙배(양구) 우승</span>
              <code>21 × 3 × 4 × 3 = 756점</code>
            </li>
            <li>
              <span>같은 규모와 성적의 직전 대회</span>
              <code>21 × 3 × 4 × 2 = 504점</code>
            </li>
            <li>
              <span>최신 22팀 경인지구 연맹전 준우승</span>
              <code>13 × 2 × 2 × 3 = 156점</code>
            </li>
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="quality-title">
          <h2 id="quality-title">데이터 검증 원칙</h2>
          <dl className="methodology-status-list">
            <div>
              <dt>
                <code>verified</code>
              </dt>
              <dd>
                동아리, 부문, 개최 연도, 참가 규모, 진출 단계가 확인되어 점수에
                반영할 수 있는 결과
              </dd>
            </div>
            <div>
              <dt>
                <code>unresolved</code>
              </dt>
              <dd>
                출처는 실제이지만 동아리 정체성이나 진출 단계가 모호해 해결
                전에는 점수에 반영하지 않는 결과
              </dd>
            </div>
            <div>
              <dt>
                <code>missing</code>
              </dt>
              <dd>
                있어야 할 출처를 확보하지 못한 상태로, 임의로 불참 처리하지
                않는 결과
              </dd>
            </div>
            <div>
              <dt>
                <code>did_not_enter</code>
              </dt>
              <dd>불참이 확인되어 대회 기여 점수가 0인 결과</dd>
            </div>
          </dl>
          <p className="methodology-note">
            unresolved와 missing 결과는 점수에서 제외하며, 미해결 원본 행은
            공개 페이지에 노출하지 않습니다.
          </p>
          <p className="methodology-note">
            WEMIX OPEN 2025는 확인된 남자부·여자부 대진과 참가 규모를 현재 공개
            점수에 반영합니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="version-title">
          <h2 id="version-title">버전과 시행일</h2>
          <dl className="methodology-version">
            <div>
              <dt>공식 버전</dt>
              <dd>
                <code>{NATIONAL_FORMULA_V3.version}</code>
              </dd>
            </div>
            <div>
              <dt>시행일</dt>
              <dd>
                <time dateTime={FORMULA_EFFECTIVE_ON}>
                  {FORMULA_EFFECTIVE_ON}
                </time>
              </dd>
            </div>
          </dl>
          <p>
            계산 스냅샷에는 공식 버전과 각 가중치 설정을 함께 저장합니다. 공식이
            바뀌면 기존 점수의 의미를 덮어쓰지 않고 새 버전을 발행합니다.
          </p>
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
