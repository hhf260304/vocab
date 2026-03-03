import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Navbar from '@/components/Navbar'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '日語單字練習',
  description: '使用間隔重複法練習日語單字',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.className} bg-stone-50 min-h-screen`}>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
