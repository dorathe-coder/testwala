'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface StudyPlan {
  id: string
  exam_type: string
  exam_date: string
}

interface ScheduleDay {
  date: string
  subject: string
  topics: string[]
  is_completed: boolean
  is_revision: boolean
  is_mock_test: boolean
}

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null)
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  useEffect(() => {
    if (activePlan) {
      loadMonthSchedule()
    }
  }, [activePlan, currentMonth])

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
    const { data: plan } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (plan) {
      setActivePlan(plan)
    }
  }

  async function loadMonthSchedule() {
    if (!activePlan) return

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const { data } = await supabase
      .from('study_schedule')
      .select('*')
      .eq('plan_id', activePlan.id)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lte('date', endOfMonth.toISOString().split('T')[0])

    setSchedule(data || [])
  }

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    const startPadding = firstDay.getDay()
    
    // Add empty days for padding
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }
    
    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  function getScheduleForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    return schedule.filter(s => s.date === dateStr)
  }

  function getDateColor(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const daySchedule = schedule.filter(s => s.date === dateStr)
    
    if (daySchedule.length === 0) return 'bg-gray-100 dark:bg-gray-800'
    
    const allCompleted = daySchedule.every(s => s.is_completed)
    const someCompleted = daySchedule.some(s => s.is_completed)
    const hasMockTest = daySchedule.some(s => s.is_mock_test)
    
    if (allCompleted) return 'bg-green-500 text-white'
    if (someCompleted) return 'bg-yellow-500 text-white'
    if (hasMockTest) return 'bg-purple-500 text-white'
    return 'bg-blue-500 text-white'
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = getDaysInMonth(currentMonth)
  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!activePlan) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-500 dark:text-gray-400">No active study plan found</p>
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              📅 Study Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {activePlan.exam_type} Preparation Schedule
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={previousMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                  
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
                  
                  <button
                    onClick={nextMonth}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-sm text-gray-600 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((date, idx) => (
                    <div key={idx} className="aspect-square">
                      {date ? (
                        <button
                          onClick={() => setSelectedDate(date.toISOString().split('T')[0])}
                          className={`w-full h-full rounded-lg font-semibold text-sm transition-all ${
                            date.toISOString().split('T')[0] === today
                              ? 'ring-2 ring-blue-600'
                              : ''
                          } ${
                            date.toISOString().split('T')[0] === selectedDate
                              ? 'ring-2 ring-purple-600'
                              : ''
                          } ${getDateColor(date)}`}
                        >
                          {date.getDate()}
                        </button>
                      ) : (
                        <div></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">Partial</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">Scheduled</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-gray-700 dark:text-gray-300">Mock Test</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  }) : 'Select a Date'}
                </h3>

                {selectedDate ? (
                  <>
                    {schedule.filter(s => s.date === selectedDate).length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No sessions scheduled</p>
                    ) : (
                      <div className="space-y-4">
                        {schedule
                          .filter(s => s.date === selectedDate)
                          .map((session, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-lg border-2 ${
                                session.is_completed
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              }`}
                            >
                              {session.is_mock_test && (
                                <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-bold mb-2">
                                  MOCK TEST
                                </span>
                              )}
                              {session.is_revision && (
                                <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs rounded-full font-bold mb-2">
                                  REVISION
                                </span>
                              )}
                              
                              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                {session.subject}
                              </h4>
                              
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <p className="font-medium mb-1">Topics:</p>
                                <ul className="list-disc list-inside">
                                  {session.topics.slice(0, 3).map((topic, i) => (
                                    <li key={i}>{topic}</li>
                                  ))}
                                </ul>
                              </div>

                              {session.is_completed && (
                                <p className="text-green-600 font-bold text-sm mt-2">✅ Completed</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Click on any date to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}