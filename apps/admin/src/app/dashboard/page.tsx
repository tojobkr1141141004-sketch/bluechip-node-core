import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  CircleCheck,
  Coins,
  Gauge,
  ShieldAlert,
  UsersRound,
  Wallet
} from "lucide-react";
import { getAdminOperationsCenter, type OperationsCenterSnapshot } from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

export const instant = false;

const numberFormat = new Intl.NumberFormat("ko-KR");

function n(value: number | undefined | null) {
  return numberFormat.format(value ?? 0);
}

function date(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "기록 없음";
}

const moduleCards = [
  { key: "members", label: "회원", icon: UsersRound, href: "/dashboard/members", permission: "members_read" as const },
  { key: "finance", label: "금융", icon: Wallet, href: "/dashboard/finance", permission: "finance_read" as const },
  { key: "mining", label: "채굴·정산", icon: Activity, href: "/dashboard/mining", permission: "mining_read" as const },
  { key: "audit", label: "감사", icon: ShieldAlert, href: "/dashboard/audit", permission: "audit_read" as const }
] as const;

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={ok
      ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] font-semibold text-emerald-200"
      : "inline-flex items-center gap-1.5 rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2.5 py-1 text-[10px] font-semibold text-amber-100"
    }>
      {ok ? <CircleCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {children}
    </span>
  );
}

function MetricCard({
  title,
  value,
  description,
  href,
  icon: Icon
}: {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: typeof UsersRound;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-emerald-300/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <Icon className="h-5 w-5 text-emerald-300" />
        <ArrowRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" />
      </div>
      <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{value}</div>
      <p className="mt-1 text-[11px] leading-5 text-zinc-500">{description}</p>
    </Link>
  );
}

function Center({ snapshot }: { snapshot: OperationsCenterSnapshot }) {
  const healthy = (snapshot.mining?.unbalanced_ledger_count ?? 0) === 0
    && (snapshot.mining?.open_errors ?? 0) === 0
    && (snapshot.mining?.stale_runs ?? 0) === 0
    && (snapshot.mining?.reconciliation_status ?? "unknown") === "healthy";

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              ADMIN OPERATIONS CENTER
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">통합 운영센터</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              지금 운영자가 확인해야 할 회원·금융·채굴 상태를 한 화면에서 확인합니다. 문제는 해당 업무 화면으로 바로 이동해 처리할 수 있습니다.
            </p>
          </div>
          <StatusPill ok={healthy}>핵심 무결성 {healthy ? "정상" : "확인 필요"}</StatusPill>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {moduleCards.map((module) => {
            const allowed = snapshot.permissions[module.permission];
            const Icon = module.icon;
            return allowed ? (
              <Link
                key={module.key}
                href={module.href}
                className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 transition hover:border-emerald-300/15"
              >
                <Icon className="h-4 w-4 text-emerald-300" />
                <div className="mt-3 text-xs font-semibold">{module.label}</div>
                <div className="mt-1 text-[10px] text-zinc-600">업무 화면 열기</div>
              </Link>
            ) : (
              <div key={module.key} className="rounded-2xl border border-white/[0.04] bg-black/5 p-4 opacity-50">
                <Icon className="h-4 w-4 text-zinc-600" />
                <div className="mt-3 text-xs font-semibold text-zinc-500">{module.label}</div>
                <div className="mt-1 text-[10px] text-zinc-700">권한 없음</div>
              </div>
            );
          })}
        </div>
      </div>

      {snapshot.alerts.length > 0 ? (
        <section className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.035] p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-200" />
            <h2 className="text-sm font-semibold">지금 확인할 운영 이슈</h2>
          </div>
          <div className="mt-4 space-y-2">
            {snapshot.alerts.map((alert) => (
              <Link
                key={alert.code}
                href={alert.href}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/10 px-4 py-3 transition hover:border-white/10"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={alert.severity === "critical"
                      ? "rounded-full border border-rose-300/10 bg-rose-300/[0.04] px-2 py-0.5 text-[9px] font-semibold text-rose-200"
                      : "rounded-full border border-amber-300/10 bg-amber-300/[0.04] px-2 py-0.5 text-[9px] font-semibold text-amber-100"
                    }>
                      {alert.severity === "critical" ? "즉시 확인" : "확인 필요"}
                    </span>
                    <span className="text-xs font-semibold">{alert.title}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">담당 영역 · {alert.owner}</div>
                </div>
                <span className="text-sm font-semibold text-zinc-200">{n(alert.count)}건 <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.03] p-5">
          <div className="flex items-center gap-2 text-emerald-200">
            <CircleCheck className="h-4 w-4" />
            <h2 className="text-sm font-semibold">현재 등록된 운영 이슈가 없습니다</h2>
          </div>
          <p className="mt-1 text-[11px] text-zinc-600">대기 업무와 핵심 정합성 상태를 계속 확인하세요.</p>
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.members ? (
          <MetricCard
            title="회원"
            value={n(snapshot.members.total)}
            description={`활성 ${n(snapshot.members.active)} · 비활성 ${n(snapshot.members.inactive)}`}
            href="/dashboard/members"
            icon={UsersRound}
          />
        ) : null}
        {snapshot.finance ? (
          <MetricCard
            title="금융 대기"
            value={n(snapshot.finance.pending_deposits + snapshot.finance.pending_withdrawals)}
            description={`입금 ${n(snapshot.finance.pending_deposits)} · 출금 ${n(snapshot.finance.pending_withdrawals)} · 송금중 ${n(snapshot.finance.processing_withdrawals)}`}
            href="/dashboard/finance"
            icon={Wallet}
          />
        ) : null}
        {snapshot.mining ? (
          <MetricCard
            title="활성 채굴"
            value={n(snapshot.mining.active_contracts)}
            description={`완료 ${n(snapshot.mining.completed_contracts)} · 취소 ${n(snapshot.mining.cancelled_contracts)}`}
            href="/dashboard/mining"
            icon={Activity}
          />
        ) : null}
        {snapshot.mining ? (
          <MetricCard
            title="채굴 경보"
            value={n(snapshot.mining.open_errors + snapshot.mining.stale_runs + snapshot.mining.unbalanced_ledger_count)}
            description={`오류 ${n(snapshot.mining.open_errors)} · stale ${n(snapshot.mining.stale_runs)} · Ledger ${n(snapshot.mining.unbalanced_ledger_count)}`}
            href="/dashboard/mining"
            icon={Gauge}
          />
        ) : null}
      </div>

      {snapshot.mining ? (
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">시스템 상태</h2>
              <p className="mt-1 text-[11px] text-zinc-600">현재 시스템 동작 여부를 확인하는 영역입니다. 이 화면에서는 설정을 변경하지 않습니다.</p>
            </div>
            <Link href="/dashboard/mining" className="text-[10px] font-semibold text-emerald-200">
              채굴 운영으로 이동 <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.05] bg-black/10 p-4">
              <div className="text-[10px] text-zinc-600">자동 계산</div>
              <div className="mt-2">
                <StatusPill ok={!snapshot.system?.calculation_enabled}>
                  {snapshot.system?.calculation_enabled ? "현재 활성" : "현재 비활성"}
                </StatusPill>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-black/10 p-4">
              <div className="text-[10px] text-zinc-600">보상 발행 정책</div>
              <div className="mt-2 text-sm font-semibold">{n(snapshot.system?.issuance_enabled_policies)}개 활성</div>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-black/10 p-4">
              <div className="text-[10px] text-zinc-600">마지막 정상 계산</div>
              <div className="mt-2 text-xs font-medium text-zinc-300">{date(snapshot.mining.last_successful_run_at)}</div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-[11px] leading-5 text-zinc-600">
        운영센터는 상태를 보여주는 화면입니다. 잔액·원장·채굴 보상 숫자를 직접 수정하지 않으며, 실제 변경은 각 도메인의 승인된 서버 작업을 통해서만 수행됩니다.
      </div>
    </section>
  );
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminUser();
  const result = await getAdminOperationsCenter(supabase);

  if (result.error || !result.data) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">ADMIN CONTROL CENTER</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">운영센터에 접근할 수 없습니다</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          관리자 접근 권한 또는 운영 데이터 조회 권한을 확인해 주세요.
        </p>
      </section>
    );
  }

  return <Center snapshot={result.data} />;
}
