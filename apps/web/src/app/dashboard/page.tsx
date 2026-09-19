import Link from "next/link";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CheckCircle2,
  Clock3,
  History,
  Pickaxe,
  ShieldCheck,
  Wallet
} from "lucide-react";
import {
  getActiveAssets,
  getUserAssetBalances,
  getUserLedgerHistory,
  getUserMiningContracts
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

function valueOf(value: unknown) {
  return value == null ? "0" : String(value);
}

function dateOf(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";
}

export default async function UserDashboardPage() {
  const { supabase, user } = await requireWebUser();

  const [profileResult, assetsResult, balancesResult, contractsResult, historyResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, status")
        .eq("id", user.id)
        .maybeSingle(),
      getActiveAssets(supabase),
      getUserAssetBalances(supabase, user.id),
      getUserMiningContracts(supabase),
      getUserLedgerHistory(supabase, user.id)
    ]);

  const profile = profileResult.data;
  const assets = assetsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const activeContracts = (contractsResult.data ?? []).filter(
    (item) => item.status === "active"
  );
  const history = historyResult.data ?? [];
  const hasDataError =
    assetsResult.error ||
    balancesResult.error ||
    contractsResult.error ||
    historyResult.error;

  const balanceByAsset = new Map(
    balances.map((balance) => [balance.asset_id, balance])
  );

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border p-6 sm:p-8 lg:p-10" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, var(--surface), var(--accent-soft))", boxShadow: "var(--shadow)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="app-kicker text-[10px] font-bold uppercase tracking-[0.18em]">
                USER CENTER
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {profile?.display_name ?? "회원"}님, 환영합니다.
              </h1>
              <p className="app-muted mt-3 max-w-2xl text-sm leading-6">
                오늘의 자산 상태와 채굴 활동을 한눈에 확인하고 필요한 금융 업무를 빠르게 시작하세요.
              </p>
            </div>

            <div className="app-badge px-3 py-2 text-[10px] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              계정 인증 완료
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["이메일", user.email ?? "미등록"],
              ["아이디", profile?.username ?? "미설정"],
              ["계정 상태", profile?.status ?? "확인 중"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border px-4 py-3.5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>{label}</div>
                <div className="mt-1.5 truncate text-xs font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold">현재 자산</div>
            <div className="app-muted mt-1 text-[11px]">원장 기준으로 확인되는 내 자산 잔액</div>
          </div>
          <Link href="/dashboard/assets" className="app-muted inline-flex items-center gap-1 text-[10px] font-semibold hover:underline">
            전체 보기 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {assets.slice(0, 3).map((asset) => {
            const balance = balanceByAsset.get(asset.id);
            return (
              <article key={asset.id} className="app-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="app-muted text-[10px] font-semibold">{asset.code}</span>
                </div>
                <div className="app-muted mt-6 text-[10px]">{asset.name}</div>
                <div className="mt-2 break-all text-2xl font-semibold tracking-[-0.04em]">
                  {hasDataError ? "—" : valueOf(balance?.balance)}
                </div>
                <div className="app-muted mt-1 text-[10px]">정밀도 {asset.decimals}자리</div>
              </article>
            );
          })}

          {!assets.length ? (
            <div className="app-card rounded-2xl p-6 text-sm md:col-span-3">
              <div className="app-muted">현재 활성화된 자산이 없습니다.</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="app-panel rounded-[24px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">채굴 현황</div>
              <div className="app-muted mt-1 text-[11px]">자동 계산 대상 계약과 최근 상태</div>
            </div>
            <Link href="/dashboard/mining" className="app-muted inline-flex items-center gap-1 text-[10px] font-semibold">
              채굴센터 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {activeContracts.length ? (
            <div className="mt-5 grid gap-3">
              {activeContracts.slice(0, 2).map((contract) => (
                <div key={contract.contract_id} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        <Pickaxe className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{contract.product_name ?? "채굴 상품"}</div>
                        <div className="app-muted mt-1 text-[10px]">{contract.product_code ?? "PRODUCT"} · v{String(contract.version ?? "-")}</div>
                      </div>
                    </div>
                    <span className="app-badge px-2.5 py-1 text-[9px]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                      채굴 중
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="app-muted text-[10px]">누적 채굴량</div>
                      <div className="mt-1 text-sm font-semibold">{valueOf(contract.total_reward_earned)} {contract.reward_asset_code ?? ""}</div>
                    </div>
                    <div>
                      <div className="app-muted text-[10px]">누적 지급량</div>
                      <div className="mt-1 text-sm font-semibold">{valueOf(contract.total_reward_paid)} {contract.reward_asset_code ?? ""}</div>
                    </div>
                    <div>
                      <div className="app-muted text-[10px]">미지급 잔여</div>
                      <div className="mt-1 text-sm font-semibold" style={{ color: "var(--warning)" }}>{valueOf(contract.pending_reward)} {contract.reward_asset_code ?? ""}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <Pickaxe className="mx-auto h-7 w-7" style={{ color: "var(--muted)" }} />
              <div className="mt-3 text-sm font-semibold">현재 활성 채굴 계약이 없습니다.</div>
              <div className="app-muted mt-1 text-[10px]">운영자가 계약을 활성화하면 이곳에서 바로 확인할 수 있습니다.</div>
            </div>
          )}
        </section>

        <section className="app-panel rounded-[24px] p-6">
          <div className="text-sm font-semibold">빠른 업무</div>
          <div className="app-muted mt-1 text-[11px]">자주 사용하는 사용자 기능</div>
          <div className="mt-5 grid gap-2.5">
            {([
              ["/dashboard/deposit", "입금 요청", "입금 사실을 운영자에게 전달", ArrowDownToLine],
              ["/dashboard/withdrawal", "출금 요청", "보유 자산의 출금을 신청", ArrowUpFromLine],
              ["/dashboard/history", "활동 기록", "최근 금융 거래를 확인", History]
            ] as const).map(([href, title, description, Icon]) => (
              <Link key={String(href)} href={String(href)} className="group rounded-2xl border p-3.5 transition hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--surface-strong)", color: "var(--muted-strong)" }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="app-muted mt-1 truncate text-[10px]">{description}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" style={{ color: "var(--muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold"><Activity className="h-4 w-4" style={{ color: "var(--accent)" }} /> 활동 기록</div>
          <div className="mt-3 text-2xl font-semibold">{hasDataError ? "—" : history.length}</div>
          <div className="app-muted mt-1 text-[10px]">현재 조회 가능한 금융 활동</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold"><Clock3 className="h-4 w-4" style={{ color: "var(--accent)" }} /> 활성 계약</div>
          <div className="mt-3 text-2xl font-semibold">{hasDataError ? "—" : activeContracts.length}</div>
          <div className="app-muted mt-1 text-[10px]">현재 자동 계산 대상</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
          <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /> 보호 상태</div>
          <div className="mt-3 text-sm font-semibold">인증 계정</div>
          <div className="app-muted mt-1 text-[10px]">본인 계정 범위에서 데이터 조회</div>
        </div>
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">최근 금융 활동</div>
            <div className="app-muted mt-1 text-[11px]">원장에 기록된 최신 항목</div>
          </div>
          <Link href="/dashboard/history" className="app-muted text-[10px] font-semibold">전체 기록</Link>
        </div>

        <div className="mt-5 divide-y" style={{ borderColor: "var(--border)" }}>
          {history.slice(0, 5).map((item) => (
            <div key={item.entry_id} className="flex flex-wrap items-center gap-3 py-3.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--surface-soft)", color: "var(--muted-strong)" }}>
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{item.description || "금융 거래"}</div>
                <div className="app-muted mt-1 text-[10px]">{item.asset_code ?? "자산"} · {dateOf(item.entry_created_at)}</div>
              </div>
              <div className="text-xs font-semibold" style={{ color: item.direction === "credit" ? "var(--accent)" : "var(--warning)" }}>
                {item.direction === "credit" ? "+" : "-"}{valueOf(item.amount)}
              </div>
            </div>
          ))}
          {!history.length ? (
            <div className="py-8 text-center">
              <History className="mx-auto h-6 w-6" style={{ color: "var(--muted)" }} />
              <div className="mt-2 text-xs font-semibold">아직 금융 활동 기록이 없습니다.</div>
              <div className="app-muted mt-1 text-[10px]">입금·출금·채굴 지급이 처리되면 이곳에 나타납니다.</div>
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
