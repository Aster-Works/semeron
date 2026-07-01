import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト（03 §8 / 07 step 13）。
 * アイコンは Phase 1 のプレースホルダ戦略として SVG を使用（後で raster を追加）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Semeron",
    short_name: "Semeron",
    description: "教会の毎日を、みことばと祈りでつなぐ。A daily rhythm of Scripture and prayer for your church.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F2",
    theme_color: "#FAF8F2",
    categories: ["lifestyle", "education"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
