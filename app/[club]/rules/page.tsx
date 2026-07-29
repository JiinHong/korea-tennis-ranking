import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubConfig, listClubConfigs } from "@/lib/clubs";

type ClubRulesPageProps = {
  params: Promise<{
    club: string;
  }>;
};

const CORE_RULES = [
  {
    number: "01",
    title: "위 4명까지 도전",
    description:
      "활동 중인 선수 기준으로 본인보다 위 4명까지 도전할 수 있습니다. 반대로 아래 4명의 도전에는 특별한 사유가 없다면 응해야 합니다.",
  },
  {
    number: "02",
    title: "도전자 승리 시 순위 이동",
    description:
      "도전자가 이기면 방어자의 순위를 차지하고, 그 사이의 선수들은 한 계단씩 내려갑니다. 방어자가 이기면 순위는 그대로 유지됩니다.",
  },
  {
    number: "03",
    title: "동일 상대 재도전은 14일 뒤",
    description:
      "동일한 상대와 다시 경기하려면 이전 경기일로부터 14일이 지나야 합니다. 경기 결과로 순위가 바뀌었더라도 같은 제한이 적용됩니다.",
  },
  {
    number: "04",
    title: "월 0경기 시 2계단 강등",
    description:
      "한 달 동안 확정된 경기가 0경기인 선수는 다음 달 정산에서 2계단 강등됩니다. 부상 중인 선수도 같은 기준을 적용받습니다.",
  },
] as const;

export function generateStaticParams() {
  return listClubConfigs().map((club) => ({
    club: club.slug,
  }));
}

export default async function ClubRulesPage({ params }: ClubRulesPageProps) {
  const { club: clubSlug } = await params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    notFound();
  }

  const isSeoultech = club.slug === "seoultech";

  return (
    <main className="methodology-page campus-rules-page">
      <article className="methodology-document">
        <Link className="methodology-back-link" href={`/${club.slug}`}>
          <span aria-hidden="true">←</span>
          랭킹으로 돌아가기
        </Link>

        <header className="methodology-header">
          <p className="methodology-kicker">
            {club.organization} · {club.currentSeasonName}
          </p>
          <h1>단식 랭킹 운영 규칙</h1>
          <p>
            도전 가능 상대부터 순위 변동, 재경기 제한과 월간 정산까지 현재
            시스템에 적용되는 운영 기준을 안내합니다.
          </p>
        </header>

        <section className="methodology-section" aria-labelledby="core-rules-title">
          <h2 id="core-rules-title">핵심 규칙</h2>
          <ol className="club-rules-summary">
            {CORE_RULES.map((rule) => (
              <li key={rule.number}>
                <span className="club-rules-number" aria-hidden="true">
                  {rule.number}
                </span>
                <div>
                  <strong>{rule.title}</strong>
                  <p>{rule.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="challenge-title">
          <h2 id="challenge-title">도전 상대와 순위 변동</h2>
          <p>
            활동 중인 선수 기준으로 본인보다 위 4명까지 도전할 수 있습니다.
            부상 선수는 도전 가능 범위를 계산할 때 건너뜁니다. 따라서 범위 안에
            부상 선수가 있으면 그 위의 활동 중인 선수까지 도전할 수 있습니다.
          </p>
          <div className="methodology-formula club-rules-example" role="note">
            <code>
              예: 활동 순서 10위 선수 앞에 부상 선수가 1명 있다면, 부상 선수를
              제외하고 위쪽의 활동 선수 4명까지 도전 가능
            </code>
          </div>
          <p>
            경기가 시작될 때 순위가 높은 선수가 방어자, 낮은 선수가 도전자입니다.
            도전자가 승리하면 도전자는 방어자의 기존 순위로 올라가고, 방어자부터
            도전자의 기존 순위 바로 위까지 한 계단씩 내려갑니다. 방어자가
            승리하면 순위는 변하지 않습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="match-title">
          <h2 id="match-title">경기 방식과 결과 보고</h2>
          <p>
            경기는 단식 한 세트로 진행하며 승자는 6점을 기록합니다. 사이트에는
            6:0부터 6:5까지의 결과를 입력할 수 있고, 동점은 입력할 수 없습니다.
            5:5에서는 노애드 타이브레이크(듀스)로 승부를 결정합니다.
          </p>
          <ol className="club-rules-steps" aria-label="경기 결과 보고 순서">
            <li>
              <strong>경기 전</strong>
              <span>
                카카오톡방에 현재 순위와 두 선수의 이름을 적어 경기 시작을
                알립니다.
              </span>
            </li>
            <li>
              <strong>경기 후</strong>
              <span>
                승자가 카카오톡방에 최종 점수와 순위 변동 여부를 알립니다.
              </span>
            </li>
            <li>
              <strong>사이트 입력</strong>
              <span>
                두 선수와 점수를 선택해 결과를 등록합니다. 도전자와 방어자는
                경기 전 순위를 기준으로 자동 판정됩니다.
              </span>
            </li>
          </ol>
          <p className="methodology-note">
            동일한 상대와 다시 경기하려면 이전 경기일로부터 14일이 지나야
            합니다. 방어 실패로 두 선수의 순위가 바뀐 경우에도 동일합니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="penalty-title">
          <h2 id="penalty-title">월간 미참여 정산</h2>
          <p>
            한 달 동안 확정된 경기가 0경기인 선수는 다음 달 정산에서 2계단
            강등됩니다. 시즌에 등록되어 있고 탈퇴 처리되지 않은 선수에게
            적용하며, 부상 중이어도 월간 미참여 강등 대상에 포함됩니다.
          </p>
          <p>
            여러 명이 같은 달에 강등 대상이 되면 모두에게 규칙을 동시에
            적용합니다. 강등 대상자끼리는 서로 자리를 양보하지 않기 때문에
            하위권에서는 화면상 이동 폭이 2계단보다 작거나 제자리에 남는 경우가
            생길 수 있습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="injury-title">
          <h2 id="injury-title">부상 상태</h2>
          <p>
            경기를 진행하기 어려운 부상은 관리자에게 알려 부상 상태로
            등록합니다. 부상 상태에는 종료일을 미리 정하지 않습니다. 회복할
            때까지 유지할 수 있습니다.
          </p>
          <p>
            부상 중에는 경기에 참여하거나 경기 결과를 입력할 수 없습니다. 경기에
            복귀하려면 관리자에게 부상 종료를 알리고, 관리자가 선수 상태를
            활동으로 변경한 뒤 경기를 진행해야 합니다.
          </p>
          <p className="methodology-note">
            부상 등록은 도전 범위와 경기 가능 여부를 보호하는 상태입니다. 월간
            미참여에 따른 2계단 강등을 면제하지는 않습니다.
          </p>
        </section>

        <section className="methodology-section" aria-labelledby="etiquette-title">
          <h2 id="etiquette-title">경기 운영과 예절</h2>
          <p>
            동아리 정기 대여 시간이나 코트 이용자가 많은 시간은 피하고, 가능한 한
            여유 있는 코트에서 경기를 진행합니다. 방어자는 특별한 사유가 없다면
            도전을 받아주고, 모든 참가자는 선후배와 관계없이 서로를 존중합니다.
          </p>
          <p>
            이 랭킹의 목적은 단식 실력을 겨루는 동시에 구성원이 자연스럽게
            교류하는 데 있습니다. 안전을 우선하고 무리한 경기 진행은 피해주세요.
          </p>
        </section>

        {isSeoultech ? (
          <section
            className="methodology-section"
            aria-labelledby="season-history-title"
          >
            <h2 id="season-history-title">시즌 3 시작 기준과 지난 시즌</h2>
            <p>
              시즌 3의 초기 순위는 시즌 2 최종 순위를 이어받아 구성했습니다.
              기존 선수의 순서는 유지하고, 신규 선수는 가나다순으로 기존 명단
              아래에 배치했습니다.
            </p>
            <dl className="club-rules-history">
              <div>
                <dt>시즌 2 규모</dt>
                <dd>37명의 선수 · 6개월 · 152경기</dd>
              </div>
              <div>
                <dt>최종 랭킹 1위</dt>
                <dd>오준석</dd>
              </div>
              <div>
                <dt>최다 경기</dt>
                <dd>조인석</dd>
              </div>
              <div>
                <dt>최다 방어 성공</dt>
                <dd>김도훈</dd>
              </div>
              <div>
                <dt>기량 발전</dt>
                <dd>배진욱</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </article>
    </main>
  );
}
