import { History as HistoryIcon } from "lucide-react";
import { getUserLedgerHistory } from "@apex-matrix/database";
import { historyMessages, localeFormats } from "@apex-matrix/i18n";
import { PageHeader } from "@/components/app/page-header";
import { requireWebUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

export default async function HistoryPage() {
  const { supabase, user } = await requireWebUser();
  const locale = await getRequestLocale();
  const messages = historyMessages[locale];
  const dateFormat = localeFormats[locale];
  const { data, error } = await getUserLedgerHistory(supabase, user.id);

  if (error) {
    return (
      <section className="rounded-3xl border border-red-300/10 bg-red-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">
          {messages.eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{messages.title}</h1>
        <p className="mt-2 text-sm leading-6 app-muted-strong">
          {messages.loadError}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
        icon={HistoryIcon}
      />

      <div className="overflow-hidden rounded-[24px] border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="hidden grid-cols-[1fr_120px_120px_140px] gap-4 border-b px-5 py-3 text-[10px] uppercase tracking-[0.15em] app-muted sm:grid">
          <div>{messages.transaction}</div>
          <div>{messages.asset}</div>
          <div>{messages.change}</div>
          <div>{messages.processedAt}</div>
        </div>

        {(data ?? []).map((item) => {
          const transactionType = item.transaction_type ?? "";
          const transactionStatus = item.transaction_status ?? "";
          const entryCreatedAt = item.entry_created_at;

          return (
            <div
              key={item.entry_id}
              className="grid gap-3 border-b px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_120px_120px_140px] sm:items-center"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {messages.types[transactionType] ?? transactionType ?? messages.financialTransaction}
                </div>
                <div className="mt-1 truncate text-[11px] app-muted">
                  {item.description || messages.ledgerTransaction}
                  {messages.statuses[transactionStatus]
                    ? ` · ${messages.statuses[transactionStatus]}`
                    : ""}
                </div>
              </div>
              <div className="text-sm font-semibold">{item.asset_code ?? "—"}</div>
              <div className="text-sm font-semibold">
                <span className={item.direction === "credit" ? "text-emerald-200" : "text-amber-200"}>
                  {item.direction === "credit" ? "+" : "-"}
                  {String(item.amount)}
                </span>
              </div>
              <div className="text-[11px] app-muted">
                {entryCreatedAt
                  ? new Date(entryCreatedAt).toLocaleString(dateFormat.intlLocale, {
                      timeZone: dateFormat.timeZone
                    })
                  : messages.processedAtPending}
              </div>
            </div>
          );
        })}

        {(data ?? []).length === 0 && (
          <div className="px-5 py-8 text-sm app-muted">
            {messages.empty}
          </div>
        )}
      </div>
    </section>
  );
}
