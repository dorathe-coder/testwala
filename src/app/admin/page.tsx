'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Users, BookOpen, FolderOpen, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTests: 0,
    totalCategories: 0,
    totalAttempts: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    const currentUser = await getUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (userData?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    await loadStats()
    setLoading(false)
  }

  async function loadStats() {
    const [usersCount, testsCount, categoriesCount, attemptsCount] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('tests').select('id', { count: 'exact', head: true }),
      supabase.from('test_categories').select('id', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('id', { count: 'exact', head: true })
    ])

    setStats({
      totalUsers: usersCount.count || 0,
      totalTests: testsCount.count || 0,
      totalCategories: categoriesCount.count || 0,
      totalAttempts: attemptsCount.count || 0
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            🔧 Admin Dashboard
          </h1>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</h3>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tests</h3>
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTests}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Categories</h3>
                <FolderOpen className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCategories}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Test Attempts</h3>
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAttempts}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/admin/categories"
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FolderOpen className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Categories</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create and edit test categories</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/tests"
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Tests</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage tests</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}