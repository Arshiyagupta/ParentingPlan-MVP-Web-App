import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/context/ToastContext'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: 'SafeTalk - A calmer way to co-parent',
  description: 'A simple, turn-based web app that helps high-conflict co-parents rebuild trust by alternating rounds of sharing good qualities about each other.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}