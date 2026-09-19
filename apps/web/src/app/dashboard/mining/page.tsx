import Link from "next/link";
import { Pickaxe, ShieldCheck } from "lucide-react";
import {
  commonMessages,
  localeFormats,
  localizeHref,
  miningPageMessages
} from "@apex-matrix/i18n";
import { PageHeader } from "@/components/app/page-header";
import { MiningCoreVisual } from "@/components/mining/mining-core-visual";
import {
  getUserMiningContractCancellations,
  getUserMiningProducts,
  getUserMiningRewardHistory,
  getUserMiningRewardPayments,
  getUserMiningRewardCorrections,
  getUserMiningContracts
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { startMining } from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type MiningView = "overview" | "rewards" | "payments";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedView(value: string | undefined): MiningView {
  return value === "rewards" || value === "payments" ? value : "overview";
}

function formatAmount(value: number | null | undefined) {
  return value == null ? "-" : String(value);
}

function formatDate(
  value: string | null | undefined,
  format: { intlLocale: string; timeZone: string }
) {
  return value
    ? new Date(value).toLocaleString(format.intlLocale, {
        timeZone: format.timeZone
      })
    : "-";
}

export default async function MiningPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireWebUser();
  const locale = await getRequestLocale();
  const common = commonMessages[locale];
  const messages = miningPageMessages[locale];
  const dateFormat = localeFormats[locale];
  const params = await searchParams;
  const view = selectedView(first(params.view));
  const success = first(params.success);
  const error = first(params.error);
  const href = (path: string) => localizeHref(path, locale) as never;

  const [productsResult, contractsResult] = await Promise.all([
    getUserMiningProducts(supabase, locale),
    getUserMiningContracts(supabase)
  ]);

  const [historyResult, correctionsResult] =
    view === "rewards"
      ? await Promise.all([
          getUserMiningRewardHistory(supabase, 50),
          getUserMiningRewardCorrections(supabase)
        ])
      : [null, null];

  const [paymentsResult, cancellationsResult] =
    view === "payments"
      ? await Promise.all([
          getUserMiningRewardPayments(supabase, 50),
          getUserMiningContractCancellations(supabase)
        ])
      : [null, null];

  const hasError =
    productsResult.error ||
    contractsResult.error ||
    historyResult?.error ||
    correctionsResult?.error ||
    paymentsResult?.error ||
    cancellationsResult?.error;

  if (hasError) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">MINING</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{messages.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{messages.loadError}</p>
      </section>
    );
  }

  const products = productsResult.data ?? [];
  const contracts = contractsResult.data ?? [];
  const rewardHistory = historyResult?.data ?? [];
  const corrections = correctionsResult?.data ?? [];
  const payments = paymentsResult?.data ?? [];
  const cancellations = cancellationsResult?.data ?? [];
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const localizedProductNames = new Map(
    products.map((product) => [product.product_id, product.localized_product_name])
  );

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={common.nav.mining}
        title={messages.title}
        description={messages.description}
        icon={Pickaxe}
      />

      <MiningCoreVisual
        activeContracts={activeContracts.length}
        availableProducts={products.length}
        messages={common.mining}
      />

      {success === "started" ? (
        <p className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-xs leading-5 text-emerald-200" role="status">
          {messages.started}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl border border-rose-300/10 bg-rose-300/[0.04] p-4 text-xs leading-5 text-rose-200" role="alert">
          {messages.errors[error] ?? messages.errors.failed}
        </p>
      ) : null}

      <nav aria-label={messages.title} className="grid grid-cols-3 gap-2 rounded-2xl border p-2" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
        {(["overview", "rewards", "payments"] as const).map((item) => {
          const active = view === item;
          return (
            <Link
              key={item}
              href={href(`/dashboard/mining?view=${item}`)}
              aria-current={active ? "page" : undefined}
              className="min-h-11 rounded-xl px-2 py-3 text-center text-[10px] font-semibold transition sm:text-xs"
              style={{
                color: active ? "var(--foreground)" : "var(--muted)",
                background: active ? "var(--surface)" : "transparent"
              }}
            >
              {messages.tabs[item]}
            </Link>
          );
        })}
      </nav>

      {view === "overview" ? (
        <>
          <section className="app-panel rounded-[24px] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="app-kicker text-[10px] font-bold uppercase tracking-[0.16em]">{messages.startEyebrow}</div>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">{messages.startTitle}</h2>
                <p className="app-muted mt-2 max-w-3xl text-xs leading-6">{messages.startDescription}</p>
              </div>
              <span className="app-badge px-3 py-2 text-[10px] font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" /> {messages.safeStart}
              </span>
            </div>

            {!products.length ? (
              <p className="app-card-soft mt-5 rounded-2xl p-5 text-sm app-muted">{messages.noProducts}</p>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {products.map((product) => {
                  const min = formatAmount(product.min_capacity);
                  const max = product.max_capacity == null ? null : formatAmount(product.max_capacity);
                  const unit = product.capacity_unit ?? messages.capacityUnit;
                  return (
                    <article key={product.version_id} className="app-card-soft rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="app-muted text-[10px]">{messages.product}</div>
                          <h3 className="mt-1 text-base font-semibold">{product.localized_product_name ?? messages.product}</h3>
                          <p className="app-muted mt-1 text-[10px]">
                            {messages.categories[product.product_category ?? ""] ?? product.product_category ?? messages.product} · {messages.rewardAsset} · {product.reward_asset_name ?? product.reward_asset_code ?? "-"} · {messages.period(String(product.term_days ?? "-"))}
                          </p>
                        </div>
                        <span className="app-badge px-2.5 py-1 text-[9px]">{messages.available}</span>
                      </div>

                      <p className="app-muted mt-4 text-xs leading-5">{product.localized_description || "—"}</p>
                      {product.localized_risk_notice ? (
                        <p className="mt-3 rounded-xl border p-3 text-[10px] leading-5 app-muted" style={{ borderColor: "var(--border)" }}>
                          <strong className="mr-1 text-[var(--foreground)]">{messages.riskNotice}</strong>
                          {product.localized_risk_notice}
                        </p>
                      ) : null}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <div className="app-muted text-[10px]">{messages.dailyReward}</div>
                          <div className="mt-1 text-sm font-semibold">{formatAmount(product.reward_per_unit_per_day)} {product.reward_asset_code ?? ""}</div>
                        </div>
                        <div>
                          <div className="app-muted text-[10px]">{messages.capacityRange}</div>
                          <div className="mt-1 text-sm font-semibold">{max ? `${min}–${max}` : `${messages.minimum} ${min}`} {unit}</div>
                        </div>
                      </div>

                      <form action={startMining} className="mt-5 grid gap-3">
                        <input type="hidden" name="product_version_id" value={product.version_id ?? ""} />
                        <input type="hidden" name="idempotency_key" value={`mining-user-start:${crypto.randomUUID()}`} />
                        <label className="grid gap-2 text-xs app-muted">
                          {messages.capacityLabel}
                          <div className="grid grid-cols-[minmax(0,1fr)_auto]">
                            <input
                              name="capacity"
                              required
                              inputMode="decimal"
                              placeholder={messages.capacityPlaceholder}
                              className="app-input min-h-11 rounded-l-xl px-4 py-3 text-sm"
                            />
                            <span className="grid min-h-11 place-items-center rounded-r-xl border border-l-0 px-3 text-xs" style={{ borderColor: "var(--border-strong)" }}>{unit}</span>
                          </div>
                        </label>
                        <p className="app-muted text-[10px] leading-5">{messages.startNotice}</p>
                        <button type="submit" className="app-button-primary min-h-11 rounded-xl px-4 py-3 text-xs font-bold">{messages.startButton}</button>
                      </form>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="app-panel rounded-[24px] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{messages.contracts}</h2>
                <p className="app-muted mt-1 text-[11px]">{messages.contractsDescription}</p>
              </div>
              <span className="app-badge px-3 py-1.5 text-[10px]">{messages.contractCount(contracts.length)}</span>
            </div>
            <div className="mt-5 grid gap-3">
              {contracts.map((contract) => (
                <article key={contract.contract_id} className="app-card-soft rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="app-muted text-[10px]">{contract.product_code ?? "PRODUCT"}</div>
                      <h3 className="mt-1 text-sm font-semibold">{localizedProductNames.get(contract.product_id) ?? contract.product_name ?? messages.product}</h3>
                    </div>
                    <span className="app-badge px-2.5 py-1 text-[9px]">{messages.status[contract.status ?? ""] ?? contract.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [messages.capacity, `${formatAmount(contract.capacity)} ${contract.capacity_unit ?? ""}`],
                      [messages.totalMined, `${formatAmount(contract.total_reward_earned)} ${contract.reward_asset_code ?? ""}`],
                      [messages.totalPaid, `${formatAmount(contract.total_reward_paid)} ${contract.reward_asset_code ?? ""}`],
                      [messages.pending, `${formatAmount(contract.pending_reward)} ${contract.reward_asset_code ?? ""}`]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="app-muted text-[10px]">{label}</div>
                        <div className="mt-1 text-sm font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="app-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                    <span>{messages.version(String(contract.version ?? "-"))}</span>
                    <span>{messages.contractPeriod(formatDate(contract.started_at, dateFormat), formatDate(contract.scheduled_end_at, dateFormat))}</span>
                    <span>{messages.lastCalculation(formatDate(contract.last_calculated_at, dateFormat))}</span>
                    <span>{messages.createdAt(formatDate(contract.created_at, dateFormat))}</span>
                  </div>
                </article>
              ))}
              {!contracts.length ? <p className="app-muted py-8 text-center text-sm">{messages.noContracts}</p> : null}
            </div>
          </section>
        </>
      ) : null}

      {view === "rewards" ? (
        <>
          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold">{messages.rewardsTitle}</h2>
            <p className="app-muted mt-1 text-[11px]">{messages.rewardsDescription}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="app-muted border-b text-[10px] uppercase tracking-[0.14em]">
                  <tr><th className="px-3 py-2">{messages.product}</th><th className="px-3 py-2">{messages.calculationPeriod}</th><th className="px-3 py-2">{messages.elapsed}</th><th className="px-3 py-2">{messages.reward}</th><th className="px-3 py-2">{messages.recordedAt}</th></tr>
                </thead>
                <tbody>
                  {rewardHistory.map((item) => (
                    <tr key={item.accrual_id} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-3">{item.product_name ?? item.product_code ?? "-"}</td>
                      <td className="px-3 py-3 app-muted">{formatDate(item.period_start, dateFormat)} – {formatDate(item.period_end, dateFormat)}</td>
                      <td className="px-3 py-3">{item.elapsed_seconds == null ? "-" : messages.seconds(String(item.elapsed_seconds))}</td>
                      <td className="px-3 py-3 font-semibold">{formatAmount(item.reward_amount)} {item.reward_asset_code ?? ""}</td>
                      <td className="px-3 py-3 app-muted">{formatDate(item.created_at, dateFormat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rewardHistory.length ? <p className="app-muted py-8 text-center text-xs">{messages.noRewards}</p> : null}
            </div>
          </section>

          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold">{messages.correctionsTitle}</h2>
            <p className="app-muted mt-1 text-[11px]">{messages.correctionsDescription}</p>
            <div className="mt-4 grid gap-3">
              {corrections.map((item) => (
                <article key={item.correction_id} className="app-card-soft rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-xs font-semibold">{item.correction_type ?? messages.correction}</div>
                    <div className="app-muted text-[10px]">{formatDate(item.created_at, dateFormat)}</div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><div className="app-muted text-[10px]">{messages.correctionAmount}</div><div className="mt-1 text-sm font-semibold">{formatAmount(item.amount)} · {item.ledger_transaction_id ? messages.paymentApplied : messages.pendingAdjusted}</div></div>
                    <div><div className="app-muted text-[10px]">{messages.originalRecord}</div><div className="mt-1 break-all text-xs">{item.original_accrual_id ?? messages.separateCorrection}</div></div>
                  </div>
                  <p className="app-muted mt-3 text-[10px]">{messages.correctionReason}: {item.reason ?? "-"}</p>
                </article>
              ))}
              {!corrections.length ? <p className="app-muted py-8 text-center text-xs">{messages.noCorrections}</p> : null}
            </div>
          </section>
        </>
      ) : null}

      {view === "payments" ? (
        <>
          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold">{messages.paymentsTitle}</h2>
            <p className="app-muted mt-1 text-[11px]">{messages.paymentsDescription}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[680px] w-full text-left text-xs">
                <thead className="app-muted border-b text-[10px] uppercase tracking-[0.14em]">
                  <tr><th className="px-3 py-2">{messages.paidAt}</th><th className="px-3 py-2">{messages.contract}</th><th className="px-3 py-2">{messages.paidAmount}</th><th className="px-3 py-2">{messages.recordId}</th></tr>
                </thead>
                <tbody>
                  {payments.map((item) => (
                    <tr key={item.payment_id} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="px-3 py-3 app-muted">{formatDate(item.created_at, dateFormat)}</td>
                      <td className="px-3 py-3 break-all">{item.contract_id ?? "-"}</td>
                      <td className="px-3 py-3 font-semibold">{formatAmount(item.amount)} {item.reward_asset_code ?? ""}</td>
                      <td className="px-3 py-3 break-all app-muted">{item.ledger_transaction_id ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!payments.length ? <p className="app-muted py-8 text-center text-xs">{messages.noPayments}</p> : null}
            </div>
          </section>

          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold">{messages.cancellationsTitle}</h2>
            <p className="app-muted mt-1 text-[11px]">{messages.cancellationsDescription}</p>
            <div className="mt-4 grid gap-3">
              {cancellations.map((item) => (
                <article key={item.cancellation_id} className="app-card-soft rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-xs font-semibold">{messages.cancellation}</div>
                    <div className="app-muted text-[10px]">{formatDate(item.created_at, dateFormat)}</div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div><div className="app-muted text-[10px]">{messages.paidUntilCancel}</div><div className="mt-1 text-sm font-semibold">{formatAmount(item.reward_paid_on_cancel)}</div></div>
                    <div><div className="app-muted text-[10px]">{messages.remainingPending}</div><div className="mt-1 text-sm font-semibold">{formatAmount(item.pending_reward_after_cancel)}</div></div>
                    <div><div className="app-muted text-[10px]">{messages.calculationEnded}</div><div className="mt-1 text-xs">{formatDate(item.calculated_until, dateFormat)}</div></div>
                  </div>
                  <p className="app-muted mt-3 text-[10px]">{messages.reason}: {item.reason ?? "-"}</p>
                </article>
              ))}
              {!cancellations.length ? <p className="app-muted py-8 text-center text-xs">{messages.noCancellations}</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
