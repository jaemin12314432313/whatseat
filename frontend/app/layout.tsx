import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "오늘 뭐먹지?",
  description: "팀 점심 메뉴 투표",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <Suspense
          fallback={
            <header className="h-14 border-b border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80" />
          }
        >
          <AppHeader />
        </Suspense>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
