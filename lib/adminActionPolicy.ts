export const ADMIN_ACTIONS = [
  { id: "view_dashboard", label: "운영 현황 조회", group: "조회 및 미리보기", secretRequired: false },
  { id: "view_players", label: "선수 조회", group: "조회 및 미리보기", secretRequired: false },
  { id: "view_matches", label: "경기 조회", group: "조회 및 미리보기", secretRequired: false },
  { id: "view_injuries", label: "부상 기록 조회", group: "조회 및 미리보기", secretRequired: false },
  { id: "view_rules", label: "운영 규칙 조회", group: "조회 및 미리보기", secretRequired: false },
  { id: "preview_monthly_penalty", label: "월간 강등 미리보기", group: "조회 및 미리보기", secretRequired: false },
  { id: "preview_rank_change", label: "순위 변경 미리보기", group: "조회 및 미리보기", secretRequired: false },
  { id: "export_data", label: "데이터 내보내기", group: "조회 및 미리보기", secretRequired: false },
  { id: "submit_public_match", label: "일반 경기 결과 입력", group: "일반 입력", secretRequired: false },
  { id: "edit_player_note", label: "선수 메모 수정", group: "일반 입력", secretRequired: false },
  { id: "add_player", label: "선수 추가", group: "데이터 변경", secretRequired: true },
  { id: "rename_player", label: "선수 이름 수정", group: "데이터 변경", secretRequired: true },
  { id: "deactivate_player", label: "선수 삭제 및 비활성화", group: "데이터 변경", secretRequired: true },
  { id: "change_player_status", label: "선수 상태 변경", group: "데이터 변경", secretRequired: true },
  { id: "change_rank", label: "현재 순위 직접 변경", group: "데이터 변경", secretRequired: true },
  { id: "mutate_match", label: "경기 수정·무효·복구", group: "데이터 변경", secretRequired: true },
  { id: "mutate_injury", label: "부상 보호 등록·수정·해제", group: "데이터 변경", secretRequired: true },
  { id: "apply_monthly_penalty", label: "월간 미참여 강등 적용", group: "시즌 및 일괄 작업", secretRequired: true },
  { id: "change_season", label: "시즌 시작·종료·초기화", group: "시즌 및 일괄 작업", secretRequired: true },
  { id: "bulk_import", label: "데이터 일괄 가져오기", group: "시즌 및 일괄 작업", secretRequired: true },
  { id: "change_rules", label: "운영 규칙 변경", group: "시즌 및 일괄 작업", secretRequired: true },
  { id: "recalculate_season", label: "시즌 전체 재계산", group: "시즌 및 일괄 작업", secretRequired: true },
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number]["id"];
export type AdminActionGroup = (typeof ADMIN_ACTIONS)[number]["group"];

const actionPolicy = new Map(
  ADMIN_ACTIONS.map((action) => [action.id, action.secretRequired])
);

export function requiresAdminSecret(action: AdminAction): boolean {
  return actionPolicy.get(action) ?? true;
}
