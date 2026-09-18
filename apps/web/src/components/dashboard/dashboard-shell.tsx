"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowRight,
  CircleHelp,
  Gauge,
  Globe2,
  LockKeyhole,
  Radio,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import {
  EDGE_NODES,
  getHealthLabel,
  getHealthTone,
  type EdgeNode
} from "@/lib/nodes";

type ViewKey = "overview" | "health" | "vault" | "guide";

const NAV_ITEMS: ReadonlyArray<{
  key: ViewKey;
  label: string;
  icon: typeof Globe2;
}> = [
  { key: "overview", label: "지구본 노드", icon: Globe2 },
  { key: "health", label: "자산 건강", icon: Gauge },
  { key: "vault", label: "안심 금고", icon: LockKeyhole },
  { key: "guide", label: "이용 안내", icon: CircleHelp }
];

const TOAST_POOL = [
  {
    title: "샘플 이벤트",
    message: "서울 엣지 노드의 텔레메트리 프레임이 갱신되었습니다."
  },
  {
    title: "상태 업데이트",
    message: "싱가포르 노드의 예시 지연 시간이 반영되었습니다."
  },
  {
    title: "보호 흐름",
    message: "데모 세션의 다음 보호 단계가 준비되었습니다."
  },
  {
    title: "렌더링",
    message: "SVG 스트림 애니메이션이 정상 동작 중입니다."
  }
] as const;

const INITIAL_DEMO_VALUE = 1_485_290;

type ToastItem = {
  id: number;
  title: string;
  message: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StatusPill({
  tone,
  children
}: {
  tone: "success" | "warning" | "neutral";
  children: ReactNode;
}) {
  const styles = {
    success: "border-emerald-400/15 bg-emerald-400/10 text-emerald-200",
    warning: "border-amber-300/15 bg-amber-300/10 text-amber-200",
    neutral: "border-slate-300/10 bg-slate-300/5 text-slate-300"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        styles[tone]
      )}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  mono = false
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-3.5">
      <span className="block text-[10px] text-slate-500">{label}</span>
      <strong
        className={cn(
          "mt-1 block text-[18px] font-semibold tracking-[-0.03em]",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </strong>
      {hint ? (
        <span className="mt-1 block text-[10px] leading-4 text-slate-600">{hint}</span>
      ) : null}
    </div>
  );
}

function EdgeGlobe({
  selectedNode,
  onSelect
}: {
  selectedNode: EdgeNode;
  onSelect: (node: EdgeNode) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const reducedMotion = useReducedMotion();
  const dragState = useRef({ active: false, x: 0 });

  const positionedNodes = useMemo(
    () =>
      EDGE_NODES.map((node) => {
        const x = ((node.longitude + 180) / 360) * 100;
        const y = 48 - node.latitude * 0.45;
        const depth = Math.cos(((node.longitude - rotation) * Math.PI) / 180);

        return { node, x, y, depth };
      }).sort((a, b) => a.depth - b.depth),
    [rotation]
  );

  const rotateBy = (delta: number) => {
    setRotation((value) => value + delta);
  };

  return (
    <div
      className="relative h-[300px] overflow-hidden sm:h-[340px]"
      onPointerDown={(event) => {
        dragState.current = { active: true, x: event.clientX };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragState.current.active) return;
        const delta = event.clientX - dragState.current.x;
        dragState.current.x = event.clientX;
        if (Math.abs(delta) >= 1) rotateBy(delta * 0.65);
      }}
      onPointerUp={(event) => {
        dragState.current.active = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragState.current.active = false;
      }}
      aria-describedby="globe-hint"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(34,211,238,.08),transparent_42%)]" />
      <svg
        viewBox="0 0 900 520"
        className="h-full w-full gpu-transform"
        role="img"
        aria-label="전 세계 샘플 엣지 노드 지구본"
      >
        <defs>
          <radialGradient id="globe-surface" cx="36%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#284661" />
            <stop offset="55%" stopColor="#152a43" />
            <stop offset="100%" stopColor="#081525" />
          </radialGradient>
          <linearGradient id="signal-stroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="48%" stopColor="#34d399" stopOpacity=".82" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
          <clipPath id="globe-clip">
            <circle cx="450" cy="260" r="178" />
          </clipPath>
        </defs>

        <g style={{ transform: "translateZ(0)" }}>
          <circle
            cx="450"
            cy="260"
            r="184"
            fill="rgba(34,211,238,.035)"
            stroke="rgba(148,163,184,.12)"
          />
          <circle
            cx="450"
            cy="260"
            r="178"
            fill="url(#globe-surface)"
            stroke="rgba(148,163,184,.16)"
          />

          <g
            clipPath="url(#globe-clip)"
            opacity=".46"
            stroke="#8fb2c9"
            strokeWidth="1"
            fill="none"
          >
            <ellipse cx="450" cy="260" rx="178" ry="44" />
            <ellipse cx="450" cy="260" rx="178" ry="94" />
            <ellipse cx="450" cy="260" rx="178" ry="144" />
            <ellipse cx="450" cy="260" rx="74" ry="178" />
            <ellipse cx="450" cy="260" rx="124" ry="178" />
            <ellipse cx="450" cy="260" rx="160" ry="178" />
          </g>

          <path
            d="M248 288 C332 232 391 205 450 235 S575 330 660 242"
            fill="none"
            stroke="url(#signal-stroke)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow-soft)"
            opacity=".42"
          />
          <motion.path
            d="M248 288 C332 232 391 205 450 235 S575 330 660 242"
            fill="none"
            stroke="url(#signal-stroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={{ pathLength: 0.1, opacity: 0.25 }}
            animate={
              reducedMotion
                ? { pathLength: 1, opacity: 0.7 }
                : {
                    pathLength: [0.1, 0.92, 0.1],
                    opacity: [0.25, 0.8, 0.25]
                  }
            }
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {positionedNodes.map(({ node, x, y }) => {
            const svgX = 270 + (x / 100) * 360;
            const svgY = 150 + (y / 100) * 220;
            const isSelected = node.id === selectedNode.id;
            const tone = getHealthTone(node.health);
            const fill =
              tone === "success"
                ? "#34d399"
                : tone === "warning"
                  ? "#fbbf24"
                  : "#64748b";

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={node.name + " 노드 선택"}
                onClick={() => onSelect(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(node);
                  }
                }}
              >
                {isSelected ? (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="20"
                    fill="none"
                    stroke="rgba(52,211,153,.28)"
                    strokeWidth="1.5"
                  />
                ) : null}
                <circle cx={svgX} cy={svgY} r={isSelected ? 6.2 : 4.1} fill={fill} />
                {isSelected ? (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r="12"
                    fill="none"
                    stroke="rgba(52,211,153,.25)"
                    strokeWidth="1"
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div
        id="globe-hint"
        className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] text-slate-600"
      >
        <span>드래그 회전 · 점 = 샘플 엣지 노드</span>
        <span className="hidden font-mono sm:inline">path morph · transform</span>
      </div>
    </div>
  );
}

function StreamChart() {
  const reducedMotion = useReducedMotion();
  const paths = [
    "M0 78 C78 18 132 62 212 40 S340 86 410 28 S520 62 600 18",
    "M0 64 C70 36 130 74 212 30 S340 64 410 42 S522 72 600 26"
  ];

  return (
    <div className="h-24 w-full">
      <svg
        viewBox="0 0 600 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-label="샘플 스트림 그래프"
      >
        <defs>
          <linearGradient id="stream-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity=".24" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={paths[0] + " V100 H0 Z"} fill="url(#stream-area)" />
        <motion.path
          d={paths[0]}
          fill="none"
          stroke="#34d399"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0.25 }}
          animate={
            reducedMotion
              ? { d: paths[0], pathLength: 1 }
              : { d: paths, pathLength: [0.25, 1, 0.25] }
          }
          transition={{
            duration: 5.2,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );
}

function Header({
  activeView,
  onChange
}: {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#06101d]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/20 to-cyan-300/10 shadow-[0_0_35px_rgba(52,211,153,.12)]">
            <span className="absolute inset-[-60%] animate-[shell-spin_5s_linear_infinite] bg-[conic-gradient(from_180deg,transparent,rgba(52,211,153,.45),transparent_32%)]" />
            <Zap className="relative h-5 w-5 text-emerald-200" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.02em] text-white">
              BLUECHIP · Edge Asset Hub
            </div>
            <div className="truncate text-[11px] text-slate-500">
              실시간 엣지 텔레메트리 · 보호 흐름 데모
            </div>
          </div>
        </div>

        <nav
          aria-label="주 메뉴"
          className="order-3 flex w-full gap-1 overflow-x-auto pb-0.5 md:order-none md:w-auto"
        >
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium transition",
                activeView === key
                  ? "bg-white/[0.07] text-white"
                  : "text-slate-500 hover:bg-white/[0.035] hover:text-slate-200"
              )}
              aria-current={activeView === key ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
          <span className="h-1.5 w-1.5 animate-[pulse-ring_2s_infinite] rounded-full bg-emerald-300" />
          정상 연결
        </div>
      </div>
    </header>
  );
}

function OverviewView({
  selectedNode,
  onSelect
}: {
  selectedNode: EdgeNode;
  onSelect: (node: EdgeNode) => void;
}) {
  const [demoValue, setDemoValue] = useState(INITIAL_DEMO_VALUE);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastId, setToastId] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDemoValue((value) => value + Math.floor(Math.random() * 91 - 25));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const pushToast = () => {
    const item = TOAST_POOL[toastId % TOAST_POOL.length];
    const nextId = toastId + 1;
    const toast = { id: nextId, ...item };
    setToastId(nextId);
    setToasts((items) => [toast, ...items].slice(0, 3));

    window.setTimeout(() => {
      setToasts((items) => items.filter((entry) => entry.id !== toast.id));
    }, 3200);
  };

  const healthyCount = EDGE_NODES.filter((node) => node.health === "healthy").length;

  return (
    <>
      <div
        className="pointer-events-none fixed right-4 top-16 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-2.5"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 16, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto rounded-2xl border border-emerald-300/15 bg-[#081322]/92 p-3.5 shadow-2xl shadow-black/30 backdrop-blur-2xl"
            >
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,.7)]" />
                <div>
                  <strong className="block text-xs font-semibold text-white">{toast.title}</strong>
                  <span className="mt-0.5 block text-[11px] leading-5 text-slate-400">
                    {toast.message}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_290px]">
        <aside className="glass-panel rounded-[22px] p-2.5">
          <div className="px-2.5 py-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
              Edge fleet
            </span>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              {EDGE_NODES.length} nodes
            </div>
          </div>

          <div className="grid gap-1">
            {EDGE_NODES.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  selectedNode.id === node.id
                    ? "border-emerald-300/20 bg-white/[0.045]"
                    : "border-transparent hover:bg-white/[0.025]"
                )}
                aria-pressed={selectedNode.id === node.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-200">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        node.health === "healthy"
                          ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,.7)]"
                          : node.health === "degraded"
                            ? "bg-amber-300"
                            : "bg-slate-500"
                      )}
                    />
                    {node.name}
                  </span>
                  <StatusPill tone={getHealthTone(node.health)}>
                    {getHealthLabel(node.health)}
                  </StatusPill>
                </div>
                <div className="mt-1 pl-3.5 text-[10px] text-slate-600">
                  {node.latencyMs === null ? "—" : node.latencyMs + " ms"} · {node.region}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section
          className="glass-panel overflow-hidden rounded-[22px]"
          aria-labelledby="overview-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/80">
                Live edge telemetry
              </span>
              <h1
                id="overview-title"
                className="mt-1 text-[22px] font-semibold tracking-[-0.045em] text-white"
              >
                전 세계 노드 · 실시간 시각화
              </h1>
              <p className="mt-1.5 max-w-xl text-[11px] leading-5 text-slate-500">
                SVG Path Morphing과 transform/opacity 중심의 연출을 분리해 시각적 밀도는 유지하면서
                불필요한 React re-render를 줄였습니다.
              </p>
            </div>
            <StatusPill tone="success">
              <Radio className="h-3 w-3" /> 60 FPS target
            </StatusPill>
          </div>

          <EdgeGlobe selectedNode={selectedNode} onSelect={onSelect} />

          <div className="grid gap-2.5 border-t border-white/[0.06] p-4 sm:grid-cols-3">
            <MetricCard
              label="선택 노드"
              value={selectedNode.name}
              hint={selectedNode.region + " · " + getHealthLabel(selectedNode.health)}
            />
            <MetricCard
              label="응답 속도"
              value={selectedNode.latencyMs === null ? "—" : selectedNode.latencyMs + " ms"}
              hint="샘플 텔레메트리"
              mono
            />
            <MetricCard
              label="샘플 평가 지수"
              value={"₩ " + demoValue.toLocaleString("ko-KR")}
              hint="실제 자산 가치가 아닌 UI 데모 값"
              mono
            />
          </div>

          <div className="mx-4 mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
                  Synthetic activity stream
                </span>
                <div className="mt-1 text-[11px] text-slate-300">샘플 이벤트 흐름</div>
              </div>
              <span className="font-mono text-[10px] text-slate-600 tabular-nums">auto / 1s</span>
            </div>
            <div className="mt-2">
              <StreamChart />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-slate-600">
              <span>최근</span>
              <span>샘플 스트림</span>
              <span>지금</span>
            </div>
          </div>
        </section>

        <aside className="glass-panel rounded-[22px] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">운영 상태</div>
              <div className="mt-0.5 text-[10px] text-slate-600">Observer panel</div>
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
          </div>

          <div className="mt-4 grid gap-2.5">
            <MetricCard
              label="정상 노드"
              value={healthyCount + " / " + EDGE_NODES.length}
              hint="예시 플릿 상태"
              mono
            />
            <MetricCard
              label="예시 가동률"
              value="99.8%"
              hint="UI 시각화 전용 지표"
              mono
            />
            <MetricCard
              label="샘플 스트림"
              value="120 Hz"
              hint="클라이언트 애니메이션 기준"
              mono
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={pushToast}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-3 text-[11px] font-bold text-slate-950 transition hover:brightness-105"
            >
              <Sparkles className="h-3.5 w-3.5" /> 샘플 활동 1건 생성
            </button>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="block text-[9px] text-slate-600">데이터 신선도</span>
                <b className="mt-1 block font-mono text-[13px] text-slate-300">&lt; 2s</b>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                <span className="block text-[9px] text-slate-600">보호 단계</span>
                <b className="mt-1 block text-[13px] text-slate-300">4-step</b>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.05] p-3 text-[10px] leading-5 text-slate-500">
            실제 투자, 배당, 금괴, 예치금, 출금 또는 수익을 나타내지 않는 데모 데이터입니다.
          </div>
        </aside>
      </div>
    </>
  );
}

function HealthView({
  selectedNode,
  onSelect
}: {
  selectedNode: EdgeNode;
  onSelect: (node: EdgeNode) => void;
}) {
  return (
    <section className="glass-panel rounded-[22px] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/80">
            Health monitor
          </span>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">자산 건강</h2>
          <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
            노드 응답·처리량·동기화 지연을 한 눈에 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Activity className="h-3.5 w-3.5" /> live sample
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {EDGE_NODES.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-[10px] font-medium transition",
              selectedNode.id === node.id
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-200"
            )}
          >
            {node.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <MetricCard
          label="현재 노드"
          value={selectedNode.name}
          hint={selectedNode.region + " · " + getHealthLabel(selectedNode.health)}
        />
        <MetricCard
          label="처리량"
          value={selectedNode.throughputMbps + " Mbps"}
          hint="예시 네트워크 처리량"
          mono
        />
        <MetricCard
          label="동기화"
          value={selectedNode.lastSyncSeconds + "s ago"}
          hint="마지막 샘플 이벤트"
          mono
        />
      </div>

      <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-200">Node diagnostics</div>
            <div className="mt-0.5 text-[10px] text-slate-600">
              {selectedNode.name} · diagnostic stream
            </div>
          </div>
          <StatusPill tone={getHealthTone(selectedNode.health)}>
            {getHealthLabel(selectedNode.health)}
          </StatusPill>
        </div>

        <div className="mt-4 grid gap-2">
          {[
            ["Response time", selectedNode.latencyMs === null ? "n/a" : selectedNode.latencyMs + " ms"],
            ["Throughput", selectedNode.throughputMbps + " Mbps"],
            ["Last sync", selectedNode.lastSyncSeconds + "s ago"],
            ["Channel", "edge-telemetry-v2"]
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-white/[0.05] py-2 text-[10px] last:border-b-0"
            >
              <span className="text-slate-600">{label}</span>
              <span className="font-mono text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VaultView() {
  const [phase, setPhase] = useState(0);
  const reducedMotion = useReducedMotion();

  const phases = [
    { label: "준비", detail: "보호 세션 초기화" },
    { label: "확인", detail: "노드·세션 상태 점검" },
    { label: "안전 잠금", detail: "데모 잠금 상태 활성화" },
    { label: "정산 완료", detail: "샘플 완료 상태 표시" }
  ];

  return (
    <section className="glass-panel rounded-[22px] p-5">
      <div>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/80">
          Protection flow
        </span>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">
          안심 금고 · 데모 세션
        </h2>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
          금전 결제 없이 보호 프로세스의 UI 전환만 시뮬레이션합니다.
        </p>
      </div>

      <div className="mt-6 max-w-3xl space-y-2.5">
        {phases.map((item, index) => {
          const current = index === phase;
          const complete = index < phase;

          return (
            <motion.div
              key={item.label}
              layout
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5",
                complete
                  ? "border-emerald-300/15 bg-emerald-300/[0.05]"
                  : current
                    ? "border-amber-300/15 bg-amber-300/[0.045]"
                    : "border-white/[0.06] bg-white/[0.018]"
              )}
            >
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl font-mono text-[10px] font-bold",
                  complete
                    ? "bg-emerald-300/10 text-emerald-200"
                    : current
                      ? "bg-amber-300/10 text-amber-200"
                      : "bg-white/[0.04] text-slate-500"
                )}
              >
                {complete ? "✓" : index + 1}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-200">{item.label}</div>
                <div className="mt-0.5 text-[10px] text-slate-600">{item.detail}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPhase((value) => Math.min(value + 1, phases.length - 1))}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[11px] font-bold text-slate-950 transition hover:bg-slate-200"
        >
          <ArrowRight className="h-3.5 w-3.5" /> 다음 단계
        </button>
        <button
          type="button"
          onClick={() => setPhase(0)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.06]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 처음부터
        </button>
      </div>

      <div className="mt-3 max-w-3xl rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-3 text-[10px] leading-5 text-slate-500">
        실제 예치·결제·투자·출금 기능은 연결되어 있지 않습니다.
      </div>
    </section>
  );
}

function GuideView() {
  const cards = [
    {
      title: "지구본 노드",
      copy: "SVG 기반 지구본과 노드 상태를 확인합니다. 노드를 클릭하거나 키보드로 선택할 수 있습니다.",
      Icon: Globe2
    },
    {
      title: "자산 건강",
      copy: "응답 속도·처리량·동기화 시점을 샘플 텔레메트리로 보여줍니다.",
      Icon: Gauge
    },
    {
      title: "안심 금고",
      copy: "4단계 보호 프로세스를 결제 없는 데모로 전환합니다.",
      Icon: LockKeyhole
    },
    {
      title: "접근성",
      copy: "모션 감소 설정, 키보드 입력, aria-current, 라이브 알림 영역을 기본 지원합니다.",
      Icon: ShieldCheck
    }
  ];

  return (
    <section className="glass-panel rounded-[22px] p-5">
      <div>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/80">
          Engineering guide
        </span>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em]">이용 안내</h2>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map(({ title, copy, Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4"
          >
            <Icon className="h-4 w-4 text-emerald-300" />
            <div className="mt-3 text-[11px] font-semibold text-slate-200">{title}</div>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-600">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4 text-[10px] leading-5 text-slate-500">
        샘플 수치와 이벤트는 실제 자산, 수익, 배당, 금괴, 예치금 또는 금융 거래를 나타내지 않습니다.
      </div>
    </section>
  );
}

export function DashboardShell() {
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [selectedId, setSelectedId] = useState("seoul");
  const [clientReady, setClientReady] = useState(false);
  const selectedNode = EDGE_NODES.find((node) => node.id === selectedId) ?? EDGE_NODES[0];

  useEffect(() => {
    setClientReady(true);
  }, []);

  const changeView = (view: ViewKey) => {
    startTransition(() => setActiveView(view));
  };

  return (
    <div className="min-h-screen" data-client-ready={clientReady ? "true" : "false"}>
      <Header activeView={activeView} onChange={changeView} />

      <main className="mx-auto max-w-[1380px] px-4 pb-8 pt-4 sm:px-5 lg:px-6 lg:pt-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <Server className="h-3.5 w-3.5" />
            <span className="font-mono">edge://telemetry/demo</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-[0.14em] text-slate-700">
            <span>Next 16.3</span>
            <span>React 19.3</span>
            <span>Tailwind 4.3</span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeView === "overview" ? (
              <OverviewView selectedNode={selectedNode} onSelect={(node) => setSelectedId(node.id)} />
            ) : null}
            {activeView === "health" ? (
              <HealthView selectedNode={selectedNode} onSelect={(node) => setSelectedId(node.id)} />
            ) : null}
            {activeView === "vault" ? <VaultView /> : null}
            {activeView === "guide" ? <GuideView /> : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto flex max-w-[1380px] items-center justify-between border-t border-white/[0.05] px-4 py-4 text-[9px] text-slate-700 sm:px-5 lg:px-6">
        <span>BLUECHIP Edge Asset Hub · demo environment</span>
        <span className="font-mono">/api/health · static sample telemetry</span>
      </footer>
    </div>
  );
}
