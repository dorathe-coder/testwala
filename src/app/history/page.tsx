'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Calendar, Award, Clock, TrendingUp, Filter, RefreshCw } from 'lucide-react'

interface Attempt {
  id: string
  test_id: string
  score: number
  correct_answers: number
  incorrect_answers: number
  unattempted: number
  time_taken: number
  completed_at: string
  tests: {
    title: string
    subject: string
    total_marks: number
    duration: number
    difficulty: string
    test_categories: {
      name: string
      icon: string
    } | null
  } | null
}

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [filteredAttempts, setFilteredAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [attempts, filterSubject, sortBy])

  async function checkUser() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    await loadHistory(currentUser.id)
    setLoading(false)
  }

  async function loadHistory(userId: string) {
    const { data } = await supabase
      .from('test_attempts')
      .select(`
        id,
        test_id,
        score,
        correct_answers,
        incorrect_answers,
        unattempted,
        time_taken,
        completed_at,
        tests (
          title,
          subject,
          total_marks,
          duration,
          difficulty,
          test_categories (
            name,
            icon
          )
        )
      `)
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    setAttempts(data as any || [])
  }

  function applyFilters() {
    let filtered = [...attempts]

    // Filter by subject
    if (filterSubject !== 'all') {
      filtered = filtered.filter(a => a.tests?.subject === filterSubject)
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    } else {
      filtered.sort((a, b) => b.score - a.score)
    }

    setFilteredAttempts(filtered)
  }

  const getUniqueSubjects = () => {
    const subjects = attempts.map(a => a.tests?.subject).filter(Boolean)
    return ['all', ...Array.from(new Set(subjects))]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getPercentage = (score: number, total: number) => {
    return Math.round((score / total) * 100)
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' }
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' }
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' }
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' }
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' }
    return { grade: 'F', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'Hard': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const calculateStats = () => {
    if (filteredAttempts.length === 0) return { avgScore: 0, bestScore: 0, totalTests: 0 }
    
    const avgScore = Math.round(
      filteredAttempts.reduce((sum, a) => sum + a.score, 0) / filteredAttempts.length
    )
    const bestScore = Math.max(...filteredAttempts.map(a => a.score))
    
    return { avgScore, bestScore, totalTests: filteredAttempts.length }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = calculateStats()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Test History 📚
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review your performance and track your progress
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tests</h3>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTests}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</h3>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.avgScore}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Best Score</h3>
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.bestScore}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
              </div>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {getUniqueSubjects().map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
              </select>
            </div>
          </div>

          {/* Attempts List */}
          {filteredAttempts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {attempts.length === 0 ? 'No test history yet' : 'No tests match your filters'}
              </p>
              <Link
                href="/tests"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Browse Tests
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAttempts.map((attempt) => {
                if (!attempt.tests) return null
                
                const percentage = getPercentage(attempt.score, attempt.tests.total_marks)
                const gradeInfo = getGrade(percentage)
                
                return (
                  <div
                    key={attempt.id}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Left: Test Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{attempt.tests.test_categories?.icon || '📝'}</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {attempt.tests.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {attempt.tests.test_categories?.name} • {attempt.tests.subject}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(attempt.completed_at)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(attempt.time_taken)} / {attempt.tests.duration}min</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(attempt.tests.difficulty)}`}>
                            {attempt.tests.difficulty}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <span className="text-green-600 dark:text-green-400">✓ {attempt.correct_answers} Correct</span>
                          <span className="text-red-600 dark:text-red-400">✗ {attempt.incorrect_answers} Wrong</span>
                          <span className="text-gray-600 dark:text-gray-400">− {attempt.unattempted} Skipped</span>
                        </div>
                      </div>

                      {/* Right: Score & Actions */}
                      <div className="flex flex-col items-end space-y-3">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {attempt.score}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            out of {attempt.tests.total_marks}
                          </p>
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${gradeInfo.color}`}>
                            {percentage}% • Grade {gradeInfo.grade}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/tests/${attempt.test_id}/results/${attempt.id}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            View Results
                          </Link>
                          <Link
                            href={`/tests/${attempt.test_id}`}
                            className="flex items-center space-x-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Retake</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}