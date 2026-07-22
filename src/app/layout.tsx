import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/providers/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Activ Daily · Премиальный портал", template: "%s · Activ Daily" },
  description: "Защищённый портал ActivBank для расчёта премий и ежедневных банковских операций.",
  applicationName: "Activ Daily",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Activ Daily · Премиальный портал",
    description: "Премии и ежедневные операции в одном защищённом рабочем пространстве.",
    type: "website",
    locale: "ru_RU",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Activ Daily — премии, которые видно и понятно" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Activ Daily · Премиальный портал",
    description: "Премии и ежедневные операции в одном защищённом рабочем пространстве.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111318",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body><a className="skip-link" href="#main-content">Перейти к содержимому</a><AppProvider>{children}</AppProvider></body>
    </html>
  );
}
