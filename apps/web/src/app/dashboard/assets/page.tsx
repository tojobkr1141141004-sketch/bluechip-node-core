import { WalletCards } from "lucide-react";
import { getActiveAssets, getUserAssetBalances } from "@apex-matrix/database";
import { PageHeader } from "@/components/app/page-header";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

function formatBalance(value: number) {
  return value.toLocaleString("en-US", {
    useGrouping: true,
    maximumFractionDigits: 18
  });
}

export default async function AssetsPage() {
  const { supabase, user } = await requireWebUser();
  const [assetsResult, balancesResult] = await Promise.all([
    getActiveAssets(supabase),
    getUserAssetBalances(supabase, user.id)
  ]);

  if (assetsResult.error || balancesResult.error) {
    return (
      <section className="rounded-3xl border border-red-300/10 bg-red-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">
          ASSETS
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">자산</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          자산 정보를 불러오지 못했습니다. 관리자에게 확인을 요청해 주세요.
        </p>
      </section>
    );
  }

  const balances = new Map(
    (balancesResult.data ?? []).map((item) => [item.asset_id, item])
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Assets"
        title="내 자산"
        description="현재 계정에 귀속된 자산과 원장 기준 잔액을 한눈에 확인합니다."
        icon={WalletCards}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(assetsResult.data ?? []).map((asset) => {
          const balance = balances.get(asset.id);

          return (
            <article
              key={asset.id}
              className="app-card rounded-[24px] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">{asset.name}</div>
                  <div className="mt-1 text-lg font-semibold">{asset.code}</div>
                </div>
                <div className="rounded-full border  px-2.5 py-1 text-[10px] ">
                  {asset.asset_type === "fiat" ? "원화" : "디지털 자산"}
                </div>
              </div>

              <div className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
                {formatBalance(balance?.balance ?? 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                소수점 {asset.decimals}자리 기준
              </div>
            </article>
          );
        })}

        {(assetsResult.data ?? []).length === 0 && (
          <div className="app-card rounded-[24px] p-5 text-sm text-slate-500 sm:col-span-2">
            현재 활성화된 자산이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
