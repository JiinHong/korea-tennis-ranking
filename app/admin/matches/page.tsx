import type { Metadata } from "next";
import Link from "next/link";

import { getAdminMatchClubs } from "@/lib/supabaseAdminMatches";

import AdminMatchManager from "./AdminMatchManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "경기 관리 | Korea Tennis Ranking",
  robots: { index: false, follow: false },
};

export default async function AdminMatchesPage() {
  const clubs = await getAdminMatchClubs();

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
              <span className="admin-kicker">MATCHES</span>
              <h1>경기 관리</h1>
            </div>
            <p className="admin-access-state is-sensitive">
              <span aria-hidden="true" />
              변경 시 비밀키 확인
            </p>
          </div>
        </header>

        <AdminMatchManager clubs={clubs} />
      </div>
    </main>
  );
}
