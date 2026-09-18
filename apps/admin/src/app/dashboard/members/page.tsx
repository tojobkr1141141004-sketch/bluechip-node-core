import { Search, ShieldAlert, UsersRound } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { changeMemberStatus } from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearch(value: string) {
  return value.replace(/[%_(),]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const statusLabel: Record<string, string> = {
  active: "정상",
  suspended: "정지",
  deleted: "삭제 처리"
};

export default async function MembersPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const search = normalizeSearch(first(params.q) ?? "");
  const updated = first(params.updated) === "1";
  const error = first(params.error);

  let query = supabase
    .from("admin_member_directory")
    .select(
      "id, email, display_name, username, status, created_at, confirmed_at, last_sign_in_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    const pattern = "%" + search + "%";
    query = query.or(
      ["email", "display_name", "username"]
        .map((field) => field + ".ilike." + pattern)
        .join(",")
    );
  }

  const { data: members, error: memberError } = await query;

  if (memberError) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <ShieldAlert className="h-5 w-5 text-rose-300" />
        <h1 className="mt-3 text-xl font-semibold">회원 조회 권한이 없습니다.</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          현재 운영자 역할에 members.read 권한이 없어 회원 데이터를 표시할 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              MEMBERS
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">회원 관리</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              인증 식별자, 프로필, 계정 상태를 조회합니다. 금융·채굴 잔액은 이 화면에서 변경하지 않습니다.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-zinc-400">
            <UsersRound className="h-3.5 w-3.5" /> 최대 50명
          </div>
        </div>

        {updated ? (
          <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
            회원 상태가 변경되었습니다.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
            {error === "forbidden"
              ? "회원 상태 변경 권한이 없습니다."
              : error === "invalid"
                ? "요청값을 확인하세요."
                : "요청을 처리하지 못했습니다."}
          </p>
        ) : null}

        <form action="/dashboard/members" className="mt-6 flex flex-wrap gap-2" method="get">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              name="q"
              defaultValue={search}
              placeholder="이메일·아이디·표시 이름 검색"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-9 pr-4 text-xs outline-none focus:border-emerald-300/40"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04]"
          >
            검색
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] bg-black/10 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">회원</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">최근 로그인</th>
                <th className="px-4 py-3 font-medium">인증</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">상태 변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {members?.map((member) => (
                <tr key={member.id} className="text-zinc-300">
                  <td className="px-4 py-4">
                    <div className="font-medium">{member.display_name ?? "이름 없음"}</div>
                    <div className="mt-1 font-mono text-[10px] text-zinc-600">
                      {member.username ? "@" + member.username : "아이디 미설정"}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      {member.email ?? "이메일 없음"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[10px] text-zinc-500">
                    {new Date(member.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-4 text-[10px] text-zinc-500">
                    {member.last_sign_in_at
                      ? new Date(member.last_sign_in_at).toLocaleString("ko-KR")
                      : "없음"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={member.confirmed_at ? "text-emerald-300" : "text-amber-300"}>
                      {member.confirmed_at ? "인증 완료" : "미인증"}
                    </span>
                  </td>
                  <td className="px-4 py-4">{statusLabel[member.status] ?? member.status}</td>
                  <td className="px-4 py-4">
                    <form action={changeMemberStatus} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={member.id} />
                      <select
                        name="status"
                        defaultValue={member.status}
                        className="rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[10px]"
                      >
                        <option value="active">정상</option>
                        <option value="suspended">정지</option>
                        <option value="deleted">삭제 처리</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-zinc-950"
                      >
                        적용
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!members?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-zinc-600">
                    {search ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
