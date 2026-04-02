import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatBridge — TutorMeAI',
  description: 'AI chat platform with third-party plugin integration for K-12 education',
  keywords: ['AI tutor', 'education', 'chess', 'graphing', 'quiz', 'K-12'],
  openGraph: {
    title: 'ChatBridge — TutorMeAI',
    description: 'AI tutor with interactive educational plugins',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
