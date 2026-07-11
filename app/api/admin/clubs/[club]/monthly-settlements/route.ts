import { getClubConfig } from "@/lib/clubs";
import {
  AdminMonthlySettlementCommandError,
  applyAdminMonthlySettlement,
} from "@/lib/supabaseMonthlySettlementCommands";
import { getAdminMonthlyClub } from "@/lib/supabaseMonthlySettlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MonthlySettlementRouteContext = {
  params: Promise<{ club: string }>;
};

type UnknownBody = Record<string, unknown>;

function errorResponse(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

function isAdminSecret(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

async function readBody(request: Request): Promise<UnknownBody | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as UnknownBody) : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: MonthlySettlementRouteContext
) {
  const { club } = await context.params;
  const slug = getClubConfig(club)?.slug;

  if (!slug) return errorResponse("등록되지 않은 동아리입니다.", 404);

  try {
    const monthlyClub = await getAdminMonthlyClub(slug);

    if (!monthlyClub) {
      return errorResponse("등록되지 않은 동아리입니다.", 404);
    }

    return Response.json({ ok: true, club: monthlyClub });
  } catch {
    return errorResponse("월간 정산 미리보기를 불러오지 못했습니다.", 500);
  }
}

export async function POST(
  request: Request,
  context: MonthlySettlementRouteContext
) {
  const { club } = await context.params;
  const slug = getClubConfig(club)?.slug;

  if (!slug) return errorResponse("등록되지 않은 동아리입니다.", 404);

  const body = await readBody(request);

  if (
    !body ||
    !isMonthKey(body.targetMonth) ||
    !isAdminSecret(body.adminSecret)
  ) {
    return errorResponse("월간 정산 입력값이 올바르지 않습니다.", 400);
  }

  try {
    const settlement = await applyAdminMonthlySettlement({
      clubSlug: slug,
      targetMonth: body.targetMonth,
      adminSecret: body.adminSecret,
    });

    return Response.json({ ok: true, settlement });
  } catch (error) {
    if (error instanceof AdminMonthlySettlementCommandError) {
      return errorResponse(
        error.message,
        error.kind === "forbidden" ? 403 : 400
      );
    }

    return errorResponse("월간 정산을 적용하지 못했습니다.", 500);
  }
}
