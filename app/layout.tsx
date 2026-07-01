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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper text-ink">
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
