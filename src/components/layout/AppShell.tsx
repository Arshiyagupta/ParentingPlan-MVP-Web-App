'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface AppShellProps {
  children: React.ReactNode
  showHeader?: boolean
}

export default function AppShell({ children, showHeader = true }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    setIsMenuOpen(false)
    // Redirect to home page after logout
    window.location.href = '/'
  }

  if (!showHeader) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Wordmark */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900">SafeTalk</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center text-sm text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-safetalk-green focus:ring-offset-2 rounded-lg p-2"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                    </svg>
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-slate-700 border-b border-gray-100">
                      {user?.email || 'Loading...'}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  )
}