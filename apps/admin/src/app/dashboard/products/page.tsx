import { PackageOpen, ShieldCheck } from "lucide-react";
import {
  getActiveAssets,
  getAdminMiningProductLocalizations,
  getAdminMiningProducts,
  getAdminMiningProductVersions
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  publishVersion,
  saveProductLocalization,
  submitMiningProduct,
  submitMiningVersion,
  updateProduct
} from "../mining/actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  active: "운영 중",
  paused: "일시 중지",
  archived: "보관",
  published: "발행됨",
  retired: "종료됨"
};

const CATEGORY_LABELS: Record<string, string> = {
  stock: "주식",
  crypto: "코인",
  gold: "금",
  silver: "은"
};

const LOCALES = [
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" }
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Notice({ success, error }: { success?: string; error?: string }) {
  const messages: Record<string, string> = {
    product_created: "상품 초안을 생성했습니다.",
    product_updated: "상품 정보를 저장했습니다.",
    localization_saved: "다국어 상품 콘텐츠를 저장했습니다.",
    version_created: "새 상품 버전을 저장했습니다.",
    version_published: "상품 버전을 발행했습니다. 기존 계약에는 소급 적용되지 않습니다."
  };

  if (success) {
    return (
      <p className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
        {messages[success] ?? "상품 변경을 완료했습니다."}
      </p>
    );
  }

  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
        상품 작업을 처리하지 못했습니다. 코드·입력값·발행 상태와 관리자 권한을 확인해 주세요.
      </p>
    );
  }

  return null;
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const [productsResult, versionsResult, localizationsResult, assetsResult] = await Promise.all([
    getAdminMiningProducts(supabase),
    getAdminMiningProductVersions(supabase),
    getAdminMiningProductLocalizations(supabase),
    getActiveAssets(supabase)
  ]);

  if (productsResult.error || versionsResult.error || localizationsResult.error || assetsResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">상품 관리</h1>
        <p className="mt-2 text-sm text-zinc-400">상품 데이터를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const products = productsResult.data ?? [];
  const versions = versionsResult.data ?? [];
  const localizations = localizationsResult.data ?? [];
  const assets = assetsResult.data ?? [];

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/[0.08] text-emerald-300">
            <PackageOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">PRODUCT CATALOG</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">채굴 상품·버전 관리</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              상품 정보와 계산 정책을 분리해 관리합니다. 발행된 버전은 새 계약에만 적용되며 기존 계약의 계산 기준은 유지됩니다.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Notice success={first(params.success)} error={first(params.error)} />
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="h-fit rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 xl:sticky xl:top-24">
          <h2 className="text-sm font-semibold">새 상품 초안</h2>
          <p className="mt-1 text-[11px] leading-5 text-zinc-600">초안은 사용자에게 공개되지 않습니다.</p>
          <form action={submitMiningProduct} className="mt-4 grid gap-3">
            <input type="hidden" name="return_to" value="/dashboard/products" />
            <label className="grid gap-2 text-xs text-zinc-400">상품 코드
              <input name="code" required maxLength={64} placeholder="예: GOLD_CORE_01" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs uppercase outline-none" />
            </label>
            <label className="grid gap-2 text-xs text-zinc-400">기본 상품명
              <input name="name" required maxLength={120} placeholder="예: 골드 코어" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
            </label>
            <label className="grid gap-2 text-xs text-zinc-400">기본 설명
              <textarea name="description" rows={4} maxLength={2000} placeholder="사용자가 이해하기 쉬운 상품 설명" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
            </label>
            <label className="grid gap-2 text-xs text-zinc-400">정렬 순서
              <input name="sort_order" type="number" min={0} max={100000} defaultValue={0} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
            </label>
            <button type="submit" className="min-h-11 rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950">상품 초안 생성</button>
          </form>
        </section>

        <div className="space-y-4">
          {products.map((product) => {
            const productId = product.product_id ?? "";
            const status = product.status ?? "draft";
            const isPublic = Boolean(product.is_public);
            const productVersions = versions.filter((version) => version.product_id === productId);
            const productLocalizations = localizations.filter((item) => item.product_id === productId);
            const productCategory = productLocalizations[0]?.product_category ?? "crypto";
            const completedLocales = productLocalizations.filter((item) => item.locale && item.name).length;

            return (
              <article key={productId} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">{product.product_code ?? "PRODUCT"}</div>
                    <h2 className="mt-1 text-base font-semibold">{product.product_name ?? "이름 없음"}</h2>
                    <div className="mt-1 text-[11px] text-zinc-600">
                      {STATUS_LABELS[status] ?? status} · {isPublic ? "사용자 공개" : "비공개"} · {product.published_version ? `v${product.published_version} 발행` : "발행 버전 없음"}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {CATEGORY_LABELS[productCategory] ?? productCategory} · 다국어 {completedLocales}/3
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> 버전 고정
                  </span>
                </div>

                <form action={updateProduct} className="mt-5 grid gap-3 lg:grid-cols-2">
                  <input type="hidden" name="return_to" value="/dashboard/products" />
                  <input type="hidden" name="product_id" value={productId} />
                  <input name="name" aria-label="상품명" required defaultValue={product.product_name ?? ""} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                  <input name="description" aria-label="상품 설명" defaultValue={product.description ?? ""} maxLength={2000} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                  <input name="sort_order" aria-label="정렬 순서" type="number" min={0} max={100000} defaultValue={product.sort_order ?? 0} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                  <select name="status" aria-label="상품 상태" defaultValue={status} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none">
                    <option value="draft">초안</option><option value="active">운영 중</option><option value="paused">일시 중지</option><option value="archived">보관</option>
                  </select>
                  <select name="is_public" aria-label="사용자 공개" defaultValue={isPublic ? "true" : "false"} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none">
                    <option value="false">비공개</option><option value="true">사용자 공개</option>
                  </select>
                  <label className="flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-3 text-[10px] leading-5 text-amber-100/80 lg:col-span-2">
                    <input type="checkbox" name="public_confirmation" value="confirmed" className="mt-0.5 h-4 w-4" />
                    사용자 공개로 저장하는 경우 3개 언어, 발행 버전, 상품 조건을 모두 검토했습니다. 비공개 저장에는 체크가 필요하지 않습니다.
                  </label>
                  <button type="submit" className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-zinc-200">상품 정보 저장</button>
                </form>

                <details className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4" open={completedLocales < 3}>
                  <summary className="cursor-pointer text-xs font-semibold">KO · JA · EN 상품 콘텐츠</summary>
                  <p className="mt-2 text-[11px] leading-5 text-zinc-600">
                    세 언어를 모두 저장해야 사용자 공개가 허용됩니다. 위험 고지는 상품 성격과 실제 운영 조건에 맞게 입력하세요.
                  </p>
                  <div className="mt-4 grid gap-3 2xl:grid-cols-3">
                    {LOCALES.map(({ code, label }) => {
                      const content = productLocalizations.find((item) => item.locale === code);
                      return (
                        <form key={code} action={saveProductLocalization} className="grid gap-3 rounded-xl border border-white/[0.05] p-4">
                          <input type="hidden" name="return_to" value="/dashboard/products" />
                          <input type="hidden" name="product_id" value={productId} />
                          <input type="hidden" name="locale" value={code} />
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-xs">{label}</strong>
                            <span className="text-[10px] text-zinc-600">{content?.name ? "저장됨" : "미작성"}</span>
                          </div>
                          <label className="grid gap-2 text-[10px] text-zinc-500">상품 분류
                            <select name="category" defaultValue={productCategory} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-zinc-200 outline-none">
                              {Object.entries(CATEGORY_LABELS).map(([value, categoryLabel]) => <option key={value} value={value}>{categoryLabel}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-[10px] text-zinc-500">표시 이름
                            <input name="localized_name" required maxLength={120} defaultValue={content?.name ?? ""} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-zinc-200 outline-none" />
                          </label>
                          <label className="grid gap-2 text-[10px] text-zinc-500">설명
                            <textarea name="localized_description" rows={4} maxLength={2000} defaultValue={content?.description ?? ""} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-zinc-200 outline-none" />
                          </label>
                          <label className="grid gap-2 text-[10px] text-zinc-500">위험 고지
                            <textarea name="risk_notice" rows={3} maxLength={1000} defaultValue={content?.risk_notice ?? ""} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-zinc-200 outline-none" />
                          </label>
                          <button type="submit" className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-zinc-200">{label} 저장</button>
                        </form>
                      );
                    })}
                  </div>
                </details>

                <details className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
                  <summary className="cursor-pointer text-xs font-semibold">새 계산 버전 작성</summary>
                  <form action={submitMiningVersion} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <input type="hidden" name="return_to" value="/dashboard/products" />
                    <input type="hidden" name="product_id" value={productId} />
                    <select name="reward_asset_id" required aria-label="보상 자산" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none">
                      {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} · {asset.name}</option>)}
                    </select>
                    <input name="capacity_unit" required maxLength={32} placeholder="계산 단위 예: CORE" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                    <input name="reward_per_unit_per_day" required inputMode="decimal" placeholder="단위당 하루 보상" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                    <input name="min_capacity" required inputMode="decimal" placeholder="최소 용량" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                    <input name="max_capacity" inputMode="decimal" placeholder="최대 용량(선택)" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                    <input name="term_days" type="number" min={1} max={3650} defaultValue={30} aria-label="운영 기간(일)" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
                    <button type="submit" className="min-h-11 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-xs font-semibold text-emerald-200 md:col-span-2 xl:col-span-3">새 버전 저장</button>
                  </form>
                </details>

                <div className="mt-4 space-y-2">
                  {productVersions.map((version) => (
                    <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-black/10 p-3 text-xs">
                      <div>
                        <span className="font-semibold">v{String(version.version ?? "-")}</span>
                        <span className="ml-2 text-zinc-500">{String(version.min_capacity ?? 0)}–{String(version.max_capacity ?? "제한 없음")} {version.capacity_unit ?? ""} · {String(version.term_days ?? "-")}일 · {version.reward_asset_code ?? "-"}</span>
                      </div>
                      {version.status === "draft" ? (
                        <form action={publishVersion}>
                          <input type="hidden" name="return_to" value="/dashboard/products" />
                          <input type="hidden" name="version_id" value={version.id ?? ""} />
                          <label className="mb-2 flex items-center gap-2 text-[9px] text-amber-100/70"><input type="checkbox" name="publish_confirmation" value="confirmed" required /> 새 계약 적용 확인</label>
                          <button type="submit" className="min-h-10 rounded-lg border border-amber-300/20 px-3 py-2 text-[10px] font-semibold text-amber-200">버전 발행</button>
                        </form>
                      ) : <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">{STATUS_LABELS[version.status ?? ""] ?? version.status}</span>}
                    </div>
                  ))}
                  {!productVersions.length ? <p className="py-3 text-center text-xs text-zinc-600">작성된 버전이 없습니다.</p> : null}
                </div>
              </article>
            );
          })}

          {!products.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">등록된 상품이 없습니다. 왼쪽에서 첫 상품 초안을 생성하세요.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
