'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Calendar, Clock, Target, TrendingUp, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface StudyPlan {
  id: string
  exam_type: string
  exam_date: string
  hours_per_day: number
  preparation_level: string
  created_at: string
}

interface TodaySchedule {
  id: string
  date: string
  subject: string
  topics: string[]
  target_questions: number
  estimated_hours: number
  is_completed: boolean
  is_revision: boolean
  is_mock_test: boolean
  questions_solved: number
  time_spent: number
}

interface Stats {
  total_days: number
  days_remaining: number
  completion_percentage: number
  total_scheduled: number
  completed: number
  pending: number
}

export default function StudyPlannerPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null)
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  async function checkUserAndLoad() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    await loadStudyPlan(currentUser.id)
    setLoading(false)
  }

  async function loadStudyPlan(userId: string) {
    // Load active study plan
    const { data: plan } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!plan) {
      setActivePlan(null)
      return
    }

    setActivePlan(plan)

    // Load today's schedule
    const today = new Date().toISOString().split('T')[0]
    const { data: schedule } = await supabase
      .from('study_schedule')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('date', today)

    setTodaySchedule(schedule || [])

    // Calculate stats
    await loadStats(plan.id, plan.exam_date)
  }

  async function loadStats(planId: string, examDate: string) {
    const { data: allSchedule } = await supabase
      .from('study_schedule')
      .select('is_completed')
      .eq('plan_id', planId)

    const today = new Date()
    const exam = new Date(examDate)
    const totalDays = Math.floor((exam.getTime() - new Date(activePlan?.created_at || '').getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.max(0, Math.floor((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

    const completed = allSchedule?.filter(s => s.is_completed).length || 0
    const total = allSchedule?.length || 0

    setStats({
      total_days: totalDays,
      days_remaining: daysRemaining,
      completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      total_scheduled: total,
      completed: completed,
      pending: total - completed
    })
  }

  async function markAsCompleted(scheduleId: string) {
    const { error } = await supabase
      .from('study_schedule')
      .update({ 
        is_completed: true, 
        completed_at: new Date().toISOString() 
      })
      .eq('id', scheduleId)

    if (!error && user) {
      await loadStudyPlan(user.id)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // No active plan - show create plan option
  if (!activePlan) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <Calendar className="w-20 h-20 text-blue-600 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                No Active Study Plan
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Create your personalized study plan and start preparing smartly!
              </p>
              <Link
                href="/study-planner/create"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
              >
                <Plus className="w-6 h-6" />
                <span>Create Study Plan</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📚 My Study Plan
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activePlan.exam_type} • Exam on {formatDate(activePlan.exam_date)}
              </p>
            </div>
            <Link
              href="/study-planner/calendar"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              📅 View Calendar
            </Link>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Remaining</h3>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.days_remaining}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">of {stats.total_days} total</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</h3>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.completion_percentage}%</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${stats.completion_percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</h3>
                  <CheckCircle className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-600">{stats.completed}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">sessions done</p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</h3>
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">sessions left</p>
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Target className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Target</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No study sessions scheduled for today!</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Enjoy your day off 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySchedule.map((session) => (
                  <div
                    key={session.id}
                    className={`p-6 rounded-xl border-2 ${
                      session.is_completed
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {session.is_mock_test && <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-bold">MOCK TEST</span>}
                          {session.is_revision && <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full font-bold">REVISION</span>}
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{session.subject}</h3>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topics to cover:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                            {session.topics.map((topic, idx) => (
                              <li key={idx}>{topic}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>🎯 Target: {session.target_questions} questions</span>
                          <span>⏰ Time: {session.estimated_hours}h</span>
                        </div>
                      </div>

                      <div className="ml-4">
                        {session.is_completed ? (
                          <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                            <p className="text-sm font-bold text-green-600">Completed ✅</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Link
                              href={`/tests?subject=${encodeURIComponent(session.subject)}`}
                              className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
                            >
                              Start Practice
                            </Link>
                            <button
                              onClick={() => markAsCompleted(session.id)}
                              className="block w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                            >
                              Mark Complete
                            </button>
                          </div>
                        )}
                      </div>
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