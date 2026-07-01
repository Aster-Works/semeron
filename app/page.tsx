import { redirect } from "next/navigation";

// ルートは日本語のデモ入口へ。最初の画面はマーケティングではなく「今日」。
export default function RootPage() {
  redirect("/ja");
}
