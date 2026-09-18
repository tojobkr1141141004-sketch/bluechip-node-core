export type NodeHealth = "healthy" | "degraded" | "partitioned";

export type EdgeNode = {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  health: NodeHealth;
  latencyMs: number | null;
  throughputMbps: number;
  lastSyncSeconds: number;
};

export const EDGE_NODES = [
  { id: "seoul", name: "서울", region: "APAC · KR", latitude: 37.57, longitude: 126.98, health: "healthy", latencyMs: 12, throughputMbps: 842, lastSyncSeconds: 2 },
  { id: "tokyo", name: "도쿄", region: "APAC · JP", latitude: 35.68, longitude: 139.69, health: "healthy", latencyMs: 18, throughputMbps: 798, lastSyncSeconds: 3 },
  { id: "singapore", name: "싱가포르", region: "APAC · SG", latitude: 1.35, longitude: 103.82, health: "healthy", latencyMs: 22, throughputMbps: 915, lastSyncSeconds: 2 },
  { id: "frankfurt", name: "프랑크푸르트", region: "EMEA · DE", latitude: 50.11, longitude: 8.68, health: "degraded", latencyMs: 48, throughputMbps: 622, lastSyncSeconds: 8 },
  { id: "virginia", name: "버지니아", region: "AMER · US", latitude: 38.9, longitude: -77.04, health: "healthy", latencyMs: 28, throughputMbps: 885, lastSyncSeconds: 4 },
  { id: "oregon", name: "오레곤", region: "AMER · US", latitude: 45.52, longitude: -122.68, health: "partitioned", latencyMs: null, throughputMbps: 0, lastSyncSeconds: 143 },
  { id: "sydney", name: "시드니", region: "APAC · AU", latitude: -33.87, longitude: 151.21, health: "healthy", latencyMs: 35, throughputMbps: 702, lastSyncSeconds: 5 },
  { id: "mumbai", name: "뭄바이", region: "APAC · IN", latitude: 19.08, longitude: 72.88, health: "healthy", latencyMs: 31, throughputMbps: 756, lastSyncSeconds: 4 }
] satisfies readonly EdgeNode[];

export function getHealthLabel(health: NodeHealth): string {
  if (health === "healthy") return "정상";
  if (health === "degraded") return "주의";
  return "연결 끊김";
}

export function getHealthTone(health: NodeHealth): "success" | "warning" | "neutral" {
  if (health === "healthy") return "success";
  if (health === "degraded") return "warning";
  return "neutral";
}
