import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/app/components/pwa/ServiceWorkerRegister";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const APP_NAME = "Semeron";
const APP_DESC =
  "教会の毎日を、みことばと祈りでつなぐ。A daily rhythm of Scripture, prayer, and shared life for your church.";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESC,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * ダークモード初期化。描画前に localStorage / OS設定を読んで html.dark を確定させ、
 * ライト→ダークのちらつき（FOUC）を防ぐ。設定キーは 'semeron-theme'（'dark'|'light'）。
 * 未設定時は OS の prefers-color-scheme に従う。
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('semeron-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var c=document.documentElement.classList;d?c.add('dark'):c.remove('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#12181d':'#FAF8F2');}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-paper text-ink">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-sage-strong focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          本文へスキップ / Skip to content
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
