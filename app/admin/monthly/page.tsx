import type { Metadata } from "next";
import Link from "next/link";

import { getAdminMonthlyClubs } from "@/lib/supabaseMonthlySettlements";

import AdminMonthlyManager from "./AdminMonthlyManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "월간 미참여 정산 | Korea Tennis Ranking",
  robots: { index: false, follow: false },
};

export default async function AdminMonthlyPage() {
  const clubs = await getAdminMonthlyClubs();

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header admin-subpage-header">
          <Link className="admin-root-link" href="/admin">
            <span aria-hidden="true">‹</span>
            운영 현황
          </Link>
          <div className="admin-title-row">
            <div>
              <span className="admin-kicker">MONTHLY SETTLEMENT</span>
              <h1>월간 미참여 정산</h1>
            </div>
            <p className="admin-access-state">
              <span aria-hidden="true" />
              미리보기는 비밀키 없음
            </p>
          </div>
        </header>

        <AdminMonthlyManager clubs={clubs} />
      </div>
    </main>
  );
}
