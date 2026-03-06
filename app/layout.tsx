// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "快快樂樂背單字 — 單字練習本",
  description: "使用間隔重複法練習單字",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.className} bg-stone-50 min-h-screen flex flex-col`}>
        <SessionProvider>
          <Navbar />
          <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full flex flex-col">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
