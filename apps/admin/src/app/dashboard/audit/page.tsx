import { requireAdminUser } from "@/lib/auth";

export const instant = false;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "시간 정보 없음";
}

export default async function AuditPage() {
  const { supabase } = await requireAdminUser();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, target_user_id, event_type, action, resource_type, resource_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">AUDIT</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">감사 기록</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">감사 기록을 조회할 수 없습니다. audit.read 권한과 DB 정책을 확인해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">AUDIT</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">감사 기록</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">중요한 운영 작업의 실행 주체와 대상, 처리 시각을 확인합니다.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <table className="min-w-full text-left text-[10px]">
          <thead className="border-b border-white/[0.06] text-zinc-600">
            <tr><th className="px-4 py-3">시각</th><th className="px-4 py-3">작업</th><th className="px-4 py-3">리소스</th><th className="px-4 py-3">실행 주체</th><th className="px-4 py-3">대상</th><th className="px-4 py-3">세부</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((event) => (
              <tr key={event.id} className="border-b border-white/[0.05] last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{formatDate(event.created_at)}</td>
                <td className="px-4 py-3 text-zinc-300"><div className="font-semibold">{event.action}</div><div className="mt-1 text-zinc-600">{event.event_type}</div></td>
                <td className="px-4 py-3 text-zinc-500">{event.resource_type ?? "—"}{event.resource_id ? ` · ${event.resource_id}` : ""}</td>
                <td className="max-w-[180px] truncate px-4 py-3 font-mono text-zinc-600" title={event.actor_user_id ?? "system"}>{event.actor_user_id ?? "system"}</td>
                <td className="max-w-[180px] truncate px-4 py-3 font-mono text-zinc-600" title={event.target_user_id ?? "—"}>{event.target_user_id ?? "—"}</td>
                <td className="max-w-[360px] px-4 py-3 text-zinc-600">{event.metadata ? JSON.stringify(event.metadata) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length ? <div className="py-10 text-center text-xs text-zinc-600">아직 감사 기록이 없습니다.</div> : null}
      </div>
    </section>
  );
}
