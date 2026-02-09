'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Trophy, Medal, Award, TrendingUp, Filter } from 'lucide-react'

interface LeaderboardEntry {
  user_id: string
  email: string
  full_name: string
  total_score: number
  tests_taken: number
  average_score: number
  rank: number
}

interface TestLeaderboard {
  user_id: string
  email: string
  full_name: string
  score: number
  percentage: number
  completed_at: string
  rank: number
}

export default function LeaderboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [overallLeaderboard, setOverallLeaderboard] = useState<LeaderboardEntry[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<string>('overall')
  const [testLeaderboard, setTestLeaderboard] = useState<TestLeaderboard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedTest === 'overall') {
      loadOverallLeaderboard()
    } else {
      loadTestLeaderboard(selectedTest)
    }
  }, [selectedTest])

  async function loadData() {
    const user = await getUser()
    setCurrentUser(user)

    // Load available tests
    const { data: testsData } = await supabase
      .from('tests')
      .select('id, title, subject')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setTests(testsData || [])
    await loadOverallLeaderboard()
    setLoading(false)
  }

  async function loadOverallLeaderboard() {
    // Get all completed test attempts with user data
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select(`
        user_id,
        score,
        users (
          email,
          full_name
        )
      `)
      .not('completed_at', 'is', null)

    if (!attempts) return

    // Group by user and calculate stats
    const userStats = new Map<string, any>()

    attempts.forEach((attempt: any) => {
      const userId = attempt.user_id
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user_id: userId,
          email: attempt.users?.email || 'Unknown',
          full_name: attempt.users?.full_name || 'Anonymous',
          total_score: 0,
          tests_taken: 0
        })
      }

      const stats = userStats.get(userId)
      stats.total_score += attempt.score || 0
      stats.tests_taken += 1
    })

    // Convert to array and calculate averages
    const leaderboard = Array.from(userStats.values())
      .map(user => ({
        ...user,
        average_score: Math.round(user.total_score / user.tests_taken)
      }))
      .sort((a, b) => b.total_score - a.total_score)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }))

    setOverallLeaderboard(leaderboard)
  }

  async function loadTestLeaderboard(testId: string) {
    const { data: test } = await supabase
      .from('tests')
      .select('total_marks')
      .eq('id', testId)
      .single()

    const { data: attempts } = await supabase
      .from('test_attempts')
      .select(`
        user_id,
        score,
        completed_at,
        users (
          email,
          full_name
        )
      `)
      .eq('test_id', testId)
      .not('completed_at', 'is', null)
      .order('score', { ascending: false })
      .limit(50)

    if (!attempts) return

    const leaderboard = attempts.map((attempt: any, index) => ({
      user_id: attempt.user_id,
      email: attempt.users?.email || 'Unknown',
      full_name: attempt.users?.full_name || 'Anonymous',
      score: attempt.score,
      percentage: test ? Math.round((attempt.score / test.total_marks) * 100) : 0,
      completed_at: attempt.completed_at,
      rank: index + 1
    }))

    setTestLeaderboard(leaderboard)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />
    return <span className="text-gray-600 dark:text-gray-400 font-bold">{rank}</span>
  }

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
    if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
    if (rank === 2) return 'bg-gray-50 dark:bg-gray-800 border-gray-400'
    if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
              🏆 Leaderboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Compete with peers and track your ranking
            </p>
          </div>

          {/* Filter */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="overall">🌟 Overall Leaderboard</option>
                {tests.map(test => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Overall Leaderboard */}
          {selectedTest === 'overall' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>Overall Rankings</span>
                </h2>
                <p className="text-blue-100 mt-1">Based on total score across all tests</p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {overallLeaderboard.length === 0 ? (
                  <div className="p-12 text-center">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No rankings yet</p>
                  </div>
                ) : (
                  overallLeaderboard.map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`p-4 border-l-4 ${getRankBg(entry.rank, entry.user_id === currentUser?.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 flex items-center justify-center">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {entry.full_name || entry.email.split('@')[0]}
                              {entry.user_id === currentUser?.id && (
                                <span className="ml-2 text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                                  You
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {entry.tests_taken} tests taken
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {entry.total_score}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Avg: {entry.average_score}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Test-Specific Leaderboard */}
          {selectedTest !== 'overall' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-green-600 to-teal-600 text-white">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Trophy className="w-6 h-6" />
                  <span>Test Rankings</span>
                </h2>
                <p className="text-green-100 mt-1">
                  {tests.find(t => t.id === selectedTest)?.title}
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {testLeaderboard.length === 0 ? (
                  <div className="p-12 text-center">
                    <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No attempts yet for this test</p>
                  </div>
                ) : (
                  testLeaderboard.map((entry) => (
                    <div
                      key={`${entry.user_id}-${entry.completed_at}`}
                      className={`p-4 border-l-4 ${getRankBg(entry.rank, entry.user_id === currentUser?.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 flex items-center justify-center">
                            {getRankIcon(entry.rank)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {entry.full_name || entry.email.split('@')[0]}
                              {entry.user_id === currentUser?.id && (
                                <span className="ml-2 text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                                  You
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(entry.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {entry.score}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.percentage}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}