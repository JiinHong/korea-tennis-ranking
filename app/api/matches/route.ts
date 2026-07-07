import {getMatchLogTable} from "@/lib/matchLogTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const matches = await getMatchLogTable();

        return Response.json({
            ok: true,
            count: matches.length,
            matches: matches,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        return Response.json(
            {
                ok: false,
                message,
            },
            {
                status: 500
            }
        )
    }
}