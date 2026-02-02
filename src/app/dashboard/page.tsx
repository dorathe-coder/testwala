'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Clock, Award, TrendingUp, BookOpen, Calendar, ChevronRight } from 'lucide-react'

interface Stats {
  totalAttempts: number
  averageScore: number
  totalTests: number
  lastAttemptDate: string | null
}

interface RecentAttempt {
  id: string
  score: number
  total_marks: number
  completed_at: string
  tests: {
    title: string
    subject: string
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    totalAttempts: 0,
    averageScore: 0,
    totalTests: 0,
    lastAttemptDate: null
  })
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    await loadDashboardData(currentUser.id)
    setLoading(false)
  }

  async function loadDashboardData(userId: string) {
    // Get test attempts
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select(`
        id,
        score,
        completed_at,
        tests (
          title,
          subject,
          total_marks
        )
      `)
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5)

    // Calculate stats
    const { count: totalAttempts } = await supabase
      .from('test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    const { data: allAttempts } = await supabase
      .from('test_attempts')
      .select('score')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    const averageScore = allAttempts && allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length)
      : 0

    const { count: totalTests } = await supabase
      .from('tests')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    setStats({
      totalAttempts: totalAttempts || 0,
      averageScore,
      totalTests: totalTests || 0,
      lastAttemptDate: attempts?.[0]?.completed_at || null
    })

    // Format recent attempts
    if (attempts) {
      const formatted = attempts.map((a: any) => ({
        id: a.id,
        score: a.score,
        total_marks: a.tests?.total_marks || 100,
        completed_at: a.completed_at,
        tests: {
          title: a.tests?.title || 'Unknown Test',
          subject: a.tests?.subject || 'General'
        }
      }))
      setRecentAttempts(formatted)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getPercentage = (score: number, total: number) => {
    return Math.round((score / total) * 100)
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's your learning progress
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Tests Taken</h3>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAttempts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.totalTests} tests available
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</h3>
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.averageScore}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Keep practicing!
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</h3>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.averageScore > 0 ? `${Math.round((stats.averageScore / 100) * 100)}%` : '0%'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Overall accuracy
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Activity</h3>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.lastAttemptDate ? formatDate(stats.lastAttemptDate) : 'No activity'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recent test
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/tests"
              className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Browse Tests</h3>
                  <p className="text-blue-100">Explore {stats.totalTests} available tests</p>
                </div>
                <ChevronRight className="w-8 h-8" />
              </div>
            </Link>

            <Link
              href="/tests"
              className="bg-gradient-to-r from-green-600 to-teal-600 p-6 rounded-xl shadow-lg text-white hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Start Practice</h3>
                  <p className="text-green-100">Begin a new test now</p>
                </div>
                <ChevronRight className="w-8 h-8" />
              </div>
            </Link>
          </div>

          {/* Recent Attempts */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Recent Tests
              </h2>
              <Link
                href="/history"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All →
              </Link>
            </div>

            {recentAttempts.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No tests taken yet
                </p>
                <Link
                  href="/tests"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Take Your First Test
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {attempt.tests.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>📖 {attempt.tests.subject}</span>
                        <span>📅 {formatDate(attempt.completed_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {attempt.score}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getPercentage(attempt.score, attempt.total_marks)}%
                        </p>
                      </div>
                      <Link
                        href={`/tests/${attempt.id}/results/${attempt.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        View Results
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}