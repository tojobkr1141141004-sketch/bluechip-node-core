import { CheckCircle2, Pickaxe, Sparkles } from "lucide-react";

export function MiningCoreVisual({
  activeContracts,
  availableProducts,
  messages
}: {
  activeContracts: number;
  availableProducts: number;
  messages: {
    live: string;
    title: string;
    description: string;
    activeContracts: string;
    availableProducts: string;
    serverVerified: string;
  };
}) {
  return (
    <section className="mining-visual app-panel overflow-hidden rounded-[28px]">
      <div className="grid min-h-[260px] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8">
          <div className="app-badge w-fit px-3 py-1.5 text-[10px] font-semibold">
            <span className="mining-live-dot h-2 w-2 rounded-full" aria-hidden="true" />
            {messages.live}
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
            {messages.title}
          </h2>
          <p className="app-muted mt-3 max-w-xl text-xs leading-6 sm:text-sm">
            {messages.description}
          </p>

          <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
            <div className="app-card-soft rounded-2xl p-4">
              <div className="app-muted text-[10px]">{messages.activeContracts}</div>
              <div className="mt-1 text-2xl font-semibold">{activeContracts}</div>
            </div>
            <div className="app-card-soft rounded-2xl p-4">
              <div className="app-muted text-[10px]">{messages.availableProducts}</div>
              <div className="mt-1 text-2xl font-semibold">{availableProducts}</div>
            </div>
          </div>
        </div>

        <div className="mining-stage relative grid min-h-[260px] place-items-center overflow-hidden" aria-hidden="true">
          <div className="mining-grid absolute inset-0" />
          <div className="mining-orbit mining-orbit-outer absolute h-56 w-56 rounded-full" />
          <div className="mining-orbit mining-orbit-inner absolute h-40 w-40 rounded-full" />
          <div className="mining-core relative grid h-28 w-28 place-items-center rounded-[34px]">
            <Pickaxe className="h-10 w-10" />
            <Sparkles className="mining-spark absolute -right-2 top-0 h-5 w-5" />
          </div>
          <div className="mining-chip absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {messages.serverVerified}
          </div>
        </div>
      </div>
    </section>
  );
}
