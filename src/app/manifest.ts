import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BLUECHIP · Edge Asset Hub",
    short_name: "BLUECHIP",
    description: "엣지 노드 상태와 보호 흐름을 시각화하는 데모 대시보드.",
    start_url: "/",
    display: "standalone",
    background_color: "#06101d",
    theme_color: "#06101d",
    lang: "ko"
  };
}
