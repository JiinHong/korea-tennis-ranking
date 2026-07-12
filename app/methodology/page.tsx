import Link from "next/link";

import {
  getFieldSizeFactor,
  getRecencyFactor,
  NATIONAL_FORMULA_V1,
} from "@/lib/nationalRanking/formula";

import MethodologyTableRegion from "./MethodologyTableRegion";

const FORMULA_EFFECTIVE_ON = "2026-07-12";

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

const COMPETITION_SCOPE_ROWS = [
  ["국토정중앙배(양구)", "전국", "1.00"],
  ["하늘내린인제", "전국", "1.00"],
  ["춘천소양강배", "전국", "1.00"],
  ["WEMIX OPEN", "전국", "1.00"],
  ["경인지구 연맹전", "지역", "0.85"],
] as const;

const FIELD_SIZE_REFERENCES = [16, 32, 64, 128] as const;

const RECENCY_ROWS = [
  ["최신 연도", 0],
  ["1년 전", 1],
  ["2년 전", 2],
  ["3년 이상", 3],
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

function formatFactor(value: number): string {
  return value === 0 ? "0" : value.toFixed(2);
}

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
            구합니다. 계산 중에는 전체 정밀도를 유지하고 화면에 표시할 때만
            반올림합니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="formula-title">
          <h2 id="formula-title">공식</h2>
          <p>검증된 각 대회 성적에는 아래 네 요소를 곱합니다.</p>
          <div className="methodology-formula" role="note">
            <code>
              대회 점수 = 진출 단계 점수 × 대회 범위 × 참가 규모 × 연도
              가중치
            </code>
          </div>
          <p>
            동아리의 부문별 총점은 반영 대상이 된 모든 대회 점수의 합입니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="stage-title">
          <h2 id="stage-title">진출 단계 점수</h2>
          <p>
            우승과 깊은 진출을 더 크게 보상하도록 2026 ATP 메인 드로의 단계별
            관계를 100점 기준으로 정규화했습니다. 부전승은 승리로 세지
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
                    <td>{NATIONAL_FORMULA_V1.stagePoints[stage]}</td>
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

        <section className="methodology-section" aria-labelledby="scope-title">
          <h2 id="scope-title">대회 범위 가중치</h2>
          <p>
            전국 대회는 1.00, 지역 대회인 경인지구 연맹전은 0.85를 적용합니다.
            상금, 후원 규모, 대회 연혁에 따른 주관적 보너스는 없습니다.
          </p>
          <MethodologyTableRegion label="대회 범위별 가중치">
            <table className="methodology-table">
              <caption>대회 범위별 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">대회</th>
                  <th scope="col">범위</th>
                  <th scope="col">가중치</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITION_SCOPE_ROWS.map(([competition, scope, factor]) => (
                  <tr key={competition}>
                    <th scope="row">{competition}</th>
                    <td>{scope}</td>
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
            기권 팀은 제외합니다.
          </p>
          <div className="methodology-formula methodology-formula-secondary">
            <code>
              참가 규모 = clamp({NATIONAL_FORMULA_V1.field.minimum.toFixed(2)},
              {" "}
              {NATIONAL_FORMULA_V1.field.maximum.toFixed(2)}, 1 +{" "}
              {NATIONAL_FORMULA_V1.field.step.toFixed(2)} × log₂(N /{" "}
              {NATIONAL_FORMULA_V1.field.baseline}))
            </code>
          </div>
          <MethodologyTableRegion label="참가 팀 수별 기준 가중치">
            <table className="methodology-table">
              <caption>참가 팀 수별 기준 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">실제 참가 팀 수</th>
                  <th scope="col">가중치</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_SIZE_REFERENCES.map((entrants) => (
                  <tr key={entrants}>
                    <th scope="row">{entrants}</th>
                    <td>{formatFactor(getFieldSizeFactor(entrants))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MethodologyTableRegion>
        </section>

        <section className="methodology-section" aria-labelledby="recency-title">
          <h2 id="recency-title">연도 가중치</h2>
          <p>
            최신 연도는 대회마다 독립적으로 판단합니다. 해당 대회의 가장 최근
            개최 연도에 1.00을 적용하고, 이전 성적은 해마다{" "}
            {NATIONAL_FORMULA_V1.recencyRetention.toFixed(2)}배로 줄어듭니다.
          </p>
          <MethodologyTableRegion label="대회별 연도 가중치">
            <table className="methodology-table">
              <caption>대회별 연도 가중치</caption>
              <thead>
                <tr>
                  <th scope="col">대회 내 연도 차이</th>
                  <th scope="col">가중치</th>
                </tr>
              </thead>
              <tbody>
                {RECENCY_ROWS.map(([label, age]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{formatFactor(getRecencyFactor(2026, 2026 - age))}</td>
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
            않습니다. 팀 접미사는 동아리 정체성과 별도로 보관하며, 대학명만
            확인되는 결과는 공식 참가 명단 등으로 동아리가 검증되기 전까지
            추정해 배정하지 않습니다.
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
        </section>

        <section className="methodology-section" aria-labelledby="example-title">
          <h2 id="example-title">계산 예시</h2>
          <ol className="methodology-examples">
            <li>
              <span>최신 64팀 전국 대회 우승</span>
              <code>100 × 1.00 × 1.10 × 1.00 = 110점</code>
            </li>
            <li>
              <span>같은 대회의 1년 전 우승</span>
              <code>100 × 1.00 × 1.10 × 0.60 = 66점</code>
            </li>
            <li>
              <span>최신 128팀 경인지구 연맹전 준우승</span>
              <code>65 × 0.85 × 1.20 × 1.00 = 66.3점</code>
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
        </section>

        <section className="methodology-section" aria-labelledby="version-title">
          <h2 id="version-title">버전과 시행일</h2>
          <dl className="methodology-version">
            <div>
              <dt>공식 버전</dt>
              <dd>
                <code>{NATIONAL_FORMULA_V1.version}</code>
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
