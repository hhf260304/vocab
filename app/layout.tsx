// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import BottomTabBarWrapper from "@/components/BottomTabBarWrapper";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  userScalable: false,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "快快樂樂背單字 — 單字練習本",
  description: "使用間隔重複法練習單字",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.className} bg-gray-200`}>
        <SessionProvider>
          <div className="max-w-[430px] w-full mx-auto h-dvh flex flex-col bg-background shadow-xl overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">{children}</main>
            <BottomTabBarWrapper />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
