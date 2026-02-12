'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Menu, X, Sun, Moon, LogOut, Shield, User } from 'lucide-react'
import { getUser, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    loadUser()
  }, [])

  async function loadUser() {
    const currentUser = await getUser()
    setUser(currentUser)

    if (currentUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      setIsAdmin(userData?.role === 'admin')
    }
  }

  async function handleLogout() {
    await signOut()
    setUser(null)
    setIsAdmin(false)
    router.push('/')
    router.refresh()
  }

  if (!mounted) return null

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              🎯 TestWala
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <Link href="/tests" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Browse Tests
                </Link>
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Dashboard
                </Link>
                <Link href="/history" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  History
                </Link>
                <Link href="/leaderboard" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Leaderboard
                </Link>
              </>
            )}

            {isAdmin && (
              <Link 
                href="/admin" 
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <User className="w-4 h-4" />
                  <span>{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600">
                  Login
                </Link>
                <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <Link href="/tests" className="block px-3 py-2 rounded-md text-base font-medium">
                  Browse Tests
                </Link>
                <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium">
                  Dashboard
                </Link>
                <Link href="/history" className="block px-3 py-2 rounded-md text-base font-medium">
                  History
                </Link>
                <Link href="/leaderboard" className="block px-3 py-2 rounded-md text-base font-medium">
                  Leaderboard
                </Link>
                <Link href="/profile" className="block px-3 py-2 rounded-md text-base font-medium">
                  Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="block px-3 py-2 rounded-md text-base font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                    🔧 Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium">
                  Login
                </Link>
                <Link href="/signup" className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}