import {
  getActiveAssets,
  getAdminMiningProductVersions,
  getAdminMiningProducts,
  getMiningSettings
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  publishVersion,
  saveMiningSettings,
  submitMiningProduct,
  submitMiningVersion,
  updateProduct
} from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatAmount(value: number | null) {
  return value === null ? "제한 없음" : String(value);
}

const statusLabel: Record<string, string> = {
  draft: "초안",
  active: "운영 중",
  paused: "일시 중지",
  archived: "보관",
  published: "발행",
  retired: "종료"
};

function Notice({ success, error }: { success?: string; error?: string }) {
  if (success) {
    const messages: Record<string, string> = {
      product_created: "채굴 상품 초안을 생성했습니다.",
      product_updated: "채굴 상품 정보를 저장했습니다.",
      version_created: "새 상품 버전을 생성했습니다.",
      version_published: "상품 버전을 발행했습니다.",
      settings_saved: "채굴 설정을 저장했습니다."
    };

    return (
      <p className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
        {messages[success] ?? "채굴 운영 변경이 완료되었습니다."}
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
        채굴 설정을 처리하지 못했습니다. 입력값과 현재 상품 상태를 확인해 주세요.
      </p>
    );
  }

  return null;
}

export default async function MiningAdminPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const success = first(params.success);
  const error = first(params.error);

  const [productsResult, versionsResult, assetsResult, settingsResult] =
    await Promise.all([
      getAdminMiningProducts(supabase),
      getAdminMiningProductVersions(supabase),
      getActiveAssets(supabase),
      getMiningSettings(supabase)
    ]);

  if (
    productsResult.error ||
    versionsResult.error ||
    assetsResult.error ||
    settingsResult.error
  ) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 상품 · 설정
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          채굴 운영 데이터를 불러오지 못했습니다. mining.read 권한과 DB 정책을 확인해 주세요.
        </p>
      </section>
    );
  }

  const products = productsResult.data ?? [];
  const versions = versionsResult.data ?? [];
  const settings = settingsResult.data;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 상품 · 설정
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          채굴 상품의 기준값과 계산 환경을 관리합니다. 이 화면은 상품 정의와 설정 저장만 담당하며, 회원별 채굴 시작·실시간 계산·보상 지급은 이후 PHASE에서 연결됩니다.
        </p>
        <div className="mt-4">
          <Notice success={success} error={error} />
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div>
          <h2 className="text-sm font-semibold">채굴 계산 설정</h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            현재는 설정값만 저장합니다. calculation_enabled가 true여도 PHASE 9 계산 엔진이 없으므로 실제 계산은 실행되지 않습니다.
          </p>
        </div>

        <form action={saveMiningSettings} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-2 text-xs text-zinc-400">
            계산 활성화
            <select
              name="calculation_enabled"
              defaultValue={settings?.calculation_enabled ? "true" : "false"}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            >
              <option value="false">비활성화</option>
              <option value="true">활성화</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs text-zinc-400">
            계산 주기
            <select
              name="calculation_interval_seconds"
              defaultValue={String(settings?.calculation_interval_seconds ?? 3600)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            >
              <option value="60">1분</option>
              <option value="300">5분</option>
              <option value="900">15분</option>
              <option value="1800">30분</option>
              <option value="3600">1시간</option>
              <option value="7200">2시간</option>
              <option value="14400">4시간</option>
              <option value="86400">24시간</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs text-zinc-400">
            시간대
            <input
              value="Asia/Seoul"
              readOnly
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-zinc-500"
            />
          </label>

          <label className="grid gap-2 text-xs text-zinc-400">
            보상 정밀도
            <input
              name="reward_precision"
              type="number"
              min={0}
              max={18}
              defaultValue={settings?.reward_precision ?? 18}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <label className="grid gap-2 text-xs text-zinc-400">
            1회 처리 최대 회원 수
            <input
              name="max_accounts_per_run"
              type="number"
              min={1}
              max={100000}
              defaultValue={settings?.max_accounts_per_run ?? 1000}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950 hover:bg-zinc-100"
            >
              계산 설정 저장
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold">새 채굴 상품</h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            먼저 상품을 초안으로 생성하고, 버전을 작성한 뒤 발행합니다.
          </p>

          <form action={submitMiningProduct} className="mt-4 grid gap-3">
            <input
              name="code"
              required
              maxLength={64}
              placeholder="상품 코드 예: BASIC_01"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            />
            <input
              name="name"
              required
              maxLength={120}
              placeholder="상품명"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            />
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="상품 설명"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            />
            <input
              name="sort_order"
              type="number"
              min={0}
              max={100000}
              defaultValue={0}
              placeholder="정렬 순서"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950 hover:bg-zinc-100"
            >
              상품 초안 생성
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">상품 목록</h2>
              <p className="mt-1 text-[11px] text-zinc-600">
                직접 수정하지 않고 권한 있는 서버 함수로 상태를 변경합니다.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">
              {products.length}개 상품
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {products.map((product, index) => {
              const productId = product.product_id ?? "";
              const status = product.status ?? "draft";
              const isPublic = Boolean(product.is_public);

              return (
                <article
                  key={productId || `product-${index}`}
                  className="rounded-xl border border-white/[0.06] bg-black/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                        {product.product_code ?? "PRODUCT"}
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {product.product_name ?? "이름 없음"}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-600">
                        {statusLabel[status] ?? status}
                        {isPublic ? " · 사용자 공개" : " · 비공개"}
                        {product.published_version ? ` · v${product.published_version} 발행` : " · 발행 버전 없음"}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-zinc-600">
                      생성 {product.created_at ? new Date(product.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
                    </div>
                  </div>

                  <div className="mt-3 text-xs leading-5 text-zinc-500">
                    {product.description || "상품 설명 없음"}
                  </div>

                  <form action={updateProduct} className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_110px_140px_120px]">
                    <input type="hidden" name="product_id" value={productId} />
                    <input
                      name="name"
                      required
                      defaultValue={product.product_name ?? ""}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                    />
                    <input
                      name="description"
                      defaultValue={product.description ?? ""}
                      maxLength={2000}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      min={0}
                      max={100000}
                      defaultValue={product.sort_order ?? 0}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                    />
                    <select
                      name="status"
                      defaultValue={status}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                    >
                      <option value="draft">초안</option>
                      <option value="active">운영 중</option>
                      <option value="paused">일시 중지</option>
                      <option value="archived">보관</option>
                    </select>
                    <select
                      name="is_public"
                      defaultValue={isPublic ? "true" : "false"}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                    >
                      <option value="false">비공개</option>
                      <option value="true">공개</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-200 hover:bg-white/[0.04] lg:col-span-full lg:justify-self-end"
                    >
                      상품 정보 저장
                    </button>
                  </form>

                  <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
                    <div className="text-[10px] font-semibold text-zinc-300">
                      새 버전 작성
                    </div>
                    <form action={submitMiningVersion} className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <input type="hidden" name="product_id" value={productId} />
                      <select
                        name="reward_asset_id"
                        required
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      >
                        {assetsResult.data?.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.code} · {asset.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="capacity_unit"
                        required
                        maxLength={32}
                        placeholder="기준 단위 예: TH/s"
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        name="reward_per_unit_per_day"
                        required
                        inputMode="decimal"
                        placeholder="단위당 하루 보상"
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        name="min_capacity"
                        required
                        inputMode="decimal"
                        placeholder="최소 용량"
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        name="max_capacity"
                        inputMode="decimal"
                        placeholder="최대 용량 (선택)"
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      />
                      <input
                        name="term_days"
                        type="number"
                        min={1}
                        max={3650}
                        defaultValue={1}
                        placeholder="기간(일)"
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold text-emerald-200 md:col-span-2 xl:col-span-2"
                      >
                        새 버전 저장
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}

            {!products.length ? (
              <div className="py-8 text-center text-xs text-zinc-600">
                등록된 채굴 상품이 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div>
          <h2 className="text-sm font-semibold">상품 버전</h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            버전은 계산에 사용할 기준값의 스냅샷입니다. 발행 시 이전 발행 버전은 자동으로 종료되고, 새 버전이 현재 기준이 됩니다.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">버전</th>
                <th className="px-3 py-2">보상</th>
                <th className="px-3 py-2">용량</th>
                <th className="px-3 py-2">기간</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {versions.map((version, index) => (
                <tr key={version.id ?? `version-${index}`}>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{version.product_code ?? "-"}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">
                      {version.product_name ?? "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">v{String(version.version ?? "-")}</td>
                  <td className="px-3 py-3">
                    <div>{version.reward_asset_code ?? "-"}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">
                      {String(version.reward_per_unit_per_day ?? 0)} / {version.capacity_unit ?? "-"} / 일
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {String(version.min_capacity ?? 0)} ~ {formatAmount(version.max_capacity)} {version.capacity_unit ?? ""}
                  </td>
                  <td className="px-3 py-3">{String(version.term_days ?? "-")}일</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px]">
                      {statusLabel[version.status ?? ""] ?? version.status ?? "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {version.status === "draft" ? (
                      <form action={publishVersion}>
                        <input type="hidden" name="version_id" value={version.id ?? ""} />
                        <button
                          type="submit"
                          className="rounded-lg border border-emerald-300/15 px-3 py-2 text-[10px] font-semibold text-emerald-200"
                        >
                          버전 발행
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!versions.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">
              생성된 상품 버전이 없습니다.
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
