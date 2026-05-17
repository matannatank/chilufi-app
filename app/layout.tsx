import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { PushSubscribe } from "@/components/push-subscribe";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "חילופי",
  description: "מערכת לניהול חילופי משמרות לכבאים",
  applicationName: "חילופי",
  appleWebApp: {
    capable: true,
    title: "חילופי",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-zinc-900">
        <PushSubscribe />
        {children}
      </body>
    </html>
  );
}
