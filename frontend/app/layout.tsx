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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <Suspense
          fallback={
            <header className="h-16 border-b border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" />
          }
        >
          <AppHeader />
        </Suspense>
        <main className="flex flex-1 flex-col pb-10">{children}</main>
      </body>
    </html>
  );
}
