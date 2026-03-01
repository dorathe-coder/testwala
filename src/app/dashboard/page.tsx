'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Clock, Award, TrendingUp, BookOpen, Calendar, ChevronRight, Target, Flame, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface Stats {
  totalAttempts: number
  averageScore: number
  totalTests: number
  lastAttemptDate: string | null
  streakDays: number
}

interface RecentAttempt {
  id: string
  score: number
  total_marks: number
  completed_at: string
  test_id: string
  tests: { title: string; subject: string }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({ totalAttempts: 0, averageScore: 0, totalTests: 0, lastAttemptDate: null, streakDays: 0 })
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [subjectData, setSubjectData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    const currentUser = await getUser()
    if (!currentUser) { router.push('/login'); return }
    setUser(currentUser)
    await loadDashboardData(currentUser.id)
    setLoading(false)
  }

  async function loadDashboardData(userId: string) {
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('id, score, completed_at, test_id, tests(title, subject, total_marks)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10)

    const { count: totalAttempts } = await supabase.from('test_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null)
    const { count: totalTests } = await supabase.from('tests').select('*', { count: 'exact', head: true }).eq('is_active', true)

    const allScores = attempts?.map(a => a.score || 0) || []
    const averageScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0

    // Streak calculation
    let streakDays = 0
    if (attempts && attempts.length > 0) {
      const dates = [...new Set(attempts.map(a => new Date(a.completed_at).toDateString()))]
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      if (dates[0] === today || dates[0] === yesterday) {
        streakDays = 1
        for (let i = 1; i < dates.length; i++) {
          const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000
          if (diff <= 1) streakDays++
          else break
        }
      }
    }

    setStats({ totalAttempts: totalAttempts || 0, averageScore, totalTests: totalTests || 0, lastAttemptDate: attempts?.[0]?.completed_at || null, streakDays })

    // Weekly chart data (last 7 days)
    const weekly: any[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dayStr = d.toDateString()
      const dayAttempts = attempts?.filter(a => new Date(a.completed_at).toDateString() === dayStr) || []
      const avgScore = dayAttempts.length > 0 ? Math.round(dayAttempts.reduce((s, a) => s + (a.score || 0), 0) / dayAttempts.length) : 0
      weekly.push({ day: d.toLocaleDateString('en-IN', { weekday: 'short' }), score: avgScore, tests: dayAttempts.length })
    }
    setWeeklyData(weekly)

    // Subject wise data
    const subjectMap: Record<string, { total: number, count: number }> = {}
    attempts?.forEach((a: any) => {
      const sub = a.tests?.subject || 'General'
      if (!subjectMap[sub]) subjectMap[sub] = { total: 0, count: 0 }
      subjectMap[sub].total += a.score || 0
      subjectMap[sub].count++
    })
    const subjectArr = Object.entries(subjectMap).map(([subject, v]) => ({ subject, avg: Math.round(v.total / v.count) }))
    setSubjectData(subjectArr)

    if (attempts) {
      setRecentAttempts(attempts.slice(0, 5).map((a: any) => ({
        id: a.id, score: a.score, total_marks: a.tests?.total_marks || 100,
        completed_at: a.completed_at, test_id: a.test_id,
        tests: { title: a.tests?.title || 'Unknown', subject: a.tests?.subject || 'General' }
      })))
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const getRankBadge = () => {
    const s = stats.averageScore
    if (s >= 80) return { label: '🥇 Gold', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' }
    if (s >= 60) return { label: '🥈 Silver', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' }
    return { label: '🥉 Bronze', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  const badge = getRankBadge()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Here's your learning progress</p>
            </div>
            <div className={`flex items-center space-x-3 px-5 py-3 rounded-xl ${badge.bg} border border-gray-200 dark:border-gray-700`}>
              <Trophy className={`w-6 h-6 ${badge.color}`} />
              <div>
                <p className="text-xs text-gray-500">Your Rank</p>
                <p className={`font-bold text-lg ${badge.color}`}>{badge.label}</p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Tests Taken', value: stats.totalAttempts, icon: <BookOpen className="w-7 h-7 text-blue-600" />, sub: `${stats.totalTests} available` },
              { label: 'Avg Score', value: stats.averageScore, icon: <Award className="w-7 h-7 text-green-600" />, sub: 'Keep going!' },
              { label: 'Performance', value: `${stats.averageScore}%`, icon: <TrendingUp className="w-7 h-7 text-purple-600" />, sub: 'Overall' },
              { label: '🔥 Streak', value: `${stats.streakDays} days`, icon: <Flame className="w-7 h-7 text-orange-500" />, sub: 'Keep it up!' },
              { label: 'Last Activity', value: stats.lastAttemptDate ? formatDate(stats.lastAttemptDate) : 'None', icon: <Calendar className="w-7 h-7 text-pink-600" />, sub: 'Recent test' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Weekly Line Chart */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📈 Weekly Performance</h3>
              {weeklyData.some(d => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <p>Tests lo toh graph dikhega! 📊</p>
                </div>
              )}
            </motion.div>

            {/* Subject Bar Chart */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📚 Subject-wise Score</h3>
              {subjectData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={subjectData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <p>Alag alag subjects ke tests lo! 🎯</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { href: '/tests', gradient: 'from-blue-600 to-purple-600', icon: <BookOpen className="w-8 h-8 text-white" />, title: 'Browse Tests', sub: `${stats.totalTests} tests available` },
              { href: '/study-planner', gradient: 'from-purple-600 to-pink-600', icon: <Target className="w-8 h-8 text-white" />, title: 'Study Planner', sub: 'Create schedule' },
              { href: '/history', gradient: 'from-green-600 to-teal-600', icon: <Clock className="w-8 h-8 text-white" />, title: 'Test History', sub: 'View all results' },
            ].map((card, i) => (
              <motion.div key={card.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} whileHover={{ scale: 1.03 }}>
                <Link href={card.href} className={`block bg-gradient-to-r ${card.gradient} p-6 rounded-xl shadow-lg text-white group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-lg">{card.icon}</div>
                    <ChevronRight className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{card.title}</h3>
                  <p className="text-white/80 text-sm">{card.sub}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Recent Attempts */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Tests</h2>
              <Link href="/history" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All →</Link>
            </div>
            {recentAttempts.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No tests taken yet</p>
                <Link href="/tests" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Take Your First Test</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((attempt, i) => {
                  const pct = Math.round((attempt.score / attempt.total_marks) * 100)
                  return (
                    <motion.div key={attempt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{attempt.tests.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                          <span>📖 {attempt.tests.subject}</span>
                          <span>📅 {formatDate(attempt.completed_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{attempt.score}</p>
                          <p className={`text-sm font-medium ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</p>
                        </div>
                        <Link href={`/tests/${attempt.test_id}/results/${attempt.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                          View
                        </Link>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}