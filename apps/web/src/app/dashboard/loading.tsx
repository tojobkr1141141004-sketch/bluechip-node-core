export default function DashboardLoading() {
  return (
    <section className="space-y-4" aria-label="Loading dashboard">
      <div className="h-52 animate-pulse rounded-3xl border border-white/[0.07] bg-white/[0.025]" />
      <div className="grid gap-3 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.02]" />
        ))}
      </div>
    </section>
  );
}
