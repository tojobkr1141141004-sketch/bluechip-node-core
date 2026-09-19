import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  ExternalLink,
  LockKeyhole,
  Rocket,
  ShieldCheck
} from "lucide-react";
import {
  getAdminLaunchReadiness,
  type LaunchReadinessItem
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

export const instant = false;

function statusLabel(status: LaunchReadinessItem["status"]) {
  switch (status) {
    case "ready":
      return "준비됨";
    case "needs_setup":
      return "설정 필요";
    case "blocked":
      return "확인 필요";
    case "info":
      return "외부 확인";
  }
}

function statusClass(status: LaunchReadinessItem["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-200";
    case "needs_setup":
      return "border-amber-300/15 bg-amber-300/[0.04] text-amber-100";
    case "blocked":
      return "border-rose-300/15 bg-rose-300/[0.04] text-rose-200";
    case "info":
      return "border-white/10 bg-white/[0.025] text-zinc-300";
  }
}

function ItemIcon({ status }: { status: LaunchReadinessItem["status"] }) {
  if (status === "ready") return <CircleCheck className="h-4 w-4" />;
  if (status === "blocked") return <AlertTriangle className="h-4 w-4" />;
  if (status === "needs_setup") return <Rocket className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
}

function ReadinessCard({ item }: { item: LaunchReadinessItem }) {
  return (
    <div className="admin-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={"mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl " + statusClass(item.status)}>
            <ItemIcon status={item.status} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{item.title}</div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">{item.detail}</p>
          </div>
        </div>
        <span className={"shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold " + statusClass(item.status)}>
          {statusLabel(item.status)}
        </span>
      </div>
    </div>
  );
}

export default async function LaunchReadinessPage() {
  const { supabase } = await requireAdminUser();
  const result = await getAdminLaunchReadiness(supabase);

  if (result.error || !result.data) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          LAUNCH READINESS
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          출시 준비 상태를 불러오지 못했습니다.
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          관리자 세션과 운영 데이터 조회 권한을 확인해 주세요.
        </p>
      </section>
    );
  }

  const required = result.data.items.filter((item) => item.category === "required");
  const safety = result.data.items.filter((item) => item.category === "safety");
  const manual = result.data.items.filter((item) => item.category === "manual");

  return (
    <section className="space-y-5">
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                LAUNCH READINESS
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">출시 준비</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                실제 금융·채굴 운영을 시작하기 전에 반드시 확인해야 할 항목과 현재 안전 잠금 상태를 보여줍니다.
              </p>
            </div>
          </div>

          <div className={"rounded-2xl border px-4 py-3 " + (result.data.launch_ready
            ? "border-emerald-300/15 bg-emerald-300/[0.04]"
            : "border-amber-300/15 bg-amber-300/[0.04]")}>
            <div className="text-[10px] text-zinc-500">현재 판정</div>
            <div className={"mt-1 flex items-center gap-2 text-sm font-bold " + (result.data.launch_ready ? "text-emerald-200" : "text-amber-100")}>
              {result.data.launch_ready ? <CircleCheck className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              {result.data.launch_ready ? "출시 준비 조건 충족" : "아직 출시 준비 중"}
            </div>
            <div className="mt-1 text-[10px] text-zinc-600">
              {new Date(result.data.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">필수 준비</h2>
            <p className="mt-1 text-[11px] text-zinc-600">하나라도 준비되지 않으면 출시 준비 판정이 내려가지 않습니다.</p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {required.map((item) => <ReadinessCard key={item.key} item={item} />)}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">안전 잠금</h2>
          <p className="mt-1 text-[11px] text-zinc-600">실수로 실제 계산·발행이 시작되지 않도록 운영 전 상태를 확인합니다.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {safety.map((item) => <ReadinessCard key={item.key} item={item} />)}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">외부 확인</h2>
          <p className="mt-1 text-[11px] text-zinc-600">앱이 아닌 외부 관리 콘솔에서 최종 확인하는 항목입니다.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {manual.map((item) => <ReadinessCard key={item.key} item={item} />)}
        </div>
      </section>

      <section className="admin-soft rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold">운영 원칙</h2>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-zinc-600">
          이 화면은 상태를 읽기만 하며 금융 잔액, Ledger, 채굴 보상, 발행 정책을 직접 수정하지 않습니다.
          실제 운영을 시작할 때는 먼저 상품과 버전을 준비한 뒤 재원·발행 정책을 점검하고, 마지막 단계에서 자동 계산을 활성화합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/mining" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-white/[0.04]">
            채굴 운영으로 이동 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/dashboard/finance" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-white/[0.04]">
            금융 운영으로 이동 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </section>
  );
}
