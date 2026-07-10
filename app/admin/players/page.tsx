import type { Metadata } from "next";
import Link from "next/link";

import { getAdminPlayerClubs } from "@/lib/supabaseAdminPlayers";

import AdminPlayerManager from "./AdminPlayerManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "선수 관리 | Korea Tennis Ranking",
  robots: { index: false, follow: false },
};

export default async function AdminPlayersPage() {
  const clubs = await getAdminPlayerClubs();

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
              <span className="admin-kicker">PLAYERS</span>
              <h1>선수 관리</h1>
            </div>
            <p className="admin-access-state is-sensitive">
              <span aria-hidden="true" />
              변경 시 비밀키 확인
            </p>
          </div>
        </header>

        <AdminPlayerManager clubs={clubs} />
      </div>
    </main>
  );
}
