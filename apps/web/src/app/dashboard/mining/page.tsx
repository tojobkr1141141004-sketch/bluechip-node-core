import { getUserMiningProducts } from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

function formatAmount(value: number | null) {
  return value === null ? "제한 없음" : String(value);
}

export default async function MiningPage() {
  const { supabase } = await requireWebUser();
  const result = await getUserMiningProducts(supabase);

  if (result.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          MINING
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">채굴 상품</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          채굴 상품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  const products = result.data ?? [];

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          MINING
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">채굴 상품</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          운영자가 발행한 현재 채굴 상품의 기준값을 확인할 수 있습니다. 이 단계에서는 상품 정의와 공개 조회만 제공하며, 회원별 채굴 시작·계산·보상 지급은 다음 단계에서 연결합니다.
        </p>
      </div>

      {!products.length ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
          현재 공개된 채굴 상품이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.product_id ?? product.product_code ?? product.version_id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/70">
                    {product.product_code ?? "PRODUCT"}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold">
                    {product.product_name ?? "이름 없음"}
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.04] px-2.5 py-1 text-[10px] text-emerald-200">
                  공개 발행
                </span>
              </div>

              <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">
                {product.description || "상품 설명이 등록되지 않았습니다."}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="text-[10px] text-slate-600">보상 자산</div>
                  <div className="mt-1 text-sm font-semibold">
                    {product.reward_asset_code ?? "확인 중"} · {product.reward_asset_name ?? ""}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="text-[10px] text-slate-600">기준 단위</div>
                  <div className="mt-1 text-sm font-semibold">
                    {product.capacity_unit ?? "미지정"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="text-[10px] text-slate-600">단위당 일 보상 기준</div>
                  <div className="mt-1 text-sm font-semibold">
                    {String(product.reward_per_unit_per_day ?? 0)} {product.reward_asset_code ?? ""}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                  <div className="text-[10px] text-slate-600">용량 범위</div>
                  <div className="mt-1 text-sm font-semibold">
                    {String(product.min_capacity ?? 0)} ~ {formatAmount(product.max_capacity)} {product.capacity_unit ?? ""}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-slate-600">
                버전 {String(product.version ?? "-")} · 기간 {String(product.term_days ?? "-")}일
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
