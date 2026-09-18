import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export function AdminSectionPage({
  eyebrow,
  title,
  description,
  nextPhase
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextPhase: string;
}) {
  return (
    <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">{eyebrow}</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>

      <div className="mt-8 max-w-2xl rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-5">
        <Construction className="h-5 w-5 text-amber-300" />
        <div className="mt-3 text-sm font-semibold">운영 화면 골격 준비 완료</div>
        <p className="mt-1.5 text-xs leading-5 text-zinc-500">
          실제 조회·처리 기능은 {nextPhase}에서 DB와 연결합니다.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.04]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 운영 대시보드로
      </Link>
    </section>
  );
}
