'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Calendar, Clock, BookOpen, Target, TrendingUp } from 'lucide-react'

interface ExamSyllabus {
  exam_type: string
  subject: string
  topics: string[]
  total_questions: number
  recommended_hours: number
}

export default function CreateStudyPlanPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [syllabi, setSyllabi] = useState<ExamSyllabus[]>([])
  const [selectedExam, setSelectedExam] = useState('')
  const [formData, setFormData] = useState({
    exam_type: '',
    exam_date: '',
    hours_per_day: 3,
    preparation_level: 'intermediate',
    weak_subjects: [] as string[],
    include_weekends: true
  })
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  useEffect(() => {
    if (selectedExam) {
      loadSyllabus(selectedExam)
    }
  }, [selectedExam])

  async function checkUserAndLoad() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }

async function loadSyllabus(examType: string) {
  // Temporary: Create dummy syllabus since table doesn't exist
  const dummySyllabus = [
    { exam_type: examType, subject: 'Mathematics', topics: ['Algebra', 'Geometry', 'Calculus'], total_questions: 30, recommended_hours: 20 },
    { exam_type: examType, subject: 'Science', topics: ['Physics', 'Chemistry', 'Biology'], total_questions: 30, recommended_hours: 20 },
    { exam_type: examType, subject: 'English', topics: ['Grammar', 'Comprehension', 'Writing'], total_questions: 20, recommended_hours: 15 }
  ]
  setSyllabi(dummySyllabus)
}


  function toggleWeakSubject(subject: string) {
    setFormData(prev => ({
      ...prev,
      weak_subjects: prev.weak_subjects.includes(subject)
        ? prev.weak_subjects.filter(s => s !== subject)
        : [...prev.weak_subjects, subject]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.exam_type || !formData.exam_date) {
      toast.error('Please select exam and date')
      return
    }

    const examDate = new Date(formData.exam_date)
    const today = new Date()
    
    if (examDate <= today) {
      toast.error('Exam date must be in the future')
      return
    }

    setSubmitting(true)

    try {
      // 1. Create study plan
      const { data: plan, error: planError } = await supabase
        .from('study_plans')
        .insert([{
          user_id: user.id,
          exam_type: formData.exam_type,
          exam_date: formData.exam_date,
          hours_per_day: formData.hours_per_day,
          preparation_level: formData.preparation_level,
          weak_subjects: formData.weak_subjects,
          include_weekends: formData.include_weekends,
          is_active: true
        }])
        .select()
        .single()

      if (planError) throw planError

      // 2. Generate schedule
      await generateSchedule(plan.id, examDate)

      toast.success('Study plan created successfully!')
      router.push('/study-planner')

    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error('Failed to create study plan')
      setSubmitting(false)
    }
  }

  async function generateSchedule(planId: string, examDate: Date) {
    const today = new Date()
    const totalDays = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (totalDays <= 0) return

    // Calculate distribution
    const studyDays = formData.include_weekends 
      ? totalDays 
      : Math.floor(totalDays * 5 / 7) // Only weekdays

    const revisionDays = Math.floor(studyDays * 0.25)
    const mockTestDays = Math.floor(studyDays * 0.15)
    const learningDays = studyDays - revisionDays - mockTestDays

    // Get subjects from syllabus
    const subjects = syllabi.map(s => s.subject)
    const totalHours = learningDays * formData.hours_per_day

    // Distribute time per subject (give more time to weak subjects)
    const subjectHours: Record<string, number> = {}
    subjects.forEach(subject => {
      const baseHours = totalHours / subjects.length
      const isWeak = formData.weak_subjects.includes(subject)
      subjectHours[subject] = isWeak ? baseHours * 1.2 : baseHours
    })

    // Generate daily schedule
    const schedule = []
    let currentDate = new Date(today)
    let dayCounter = 0
    let subjectIndex = 0

    for (let i = 0; i < totalDays; i++) {
      currentDate.setDate(currentDate.getDate() + 1)
      
      // Skip weekends if not included
      if (!formData.include_weekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        continue
      }

      dayCounter++
      
      // Determine day type
      let isMockTest = false
      let isRevision = false
      
      // Every 7th day is mock test
      if (dayCounter % 7 === 0 && mockTestDays > 0) {
        isMockTest = true
      }
      // Every 6th day is revision
      else if (dayCounter % 6 === 0 && revisionDays > 0) {
        isRevision = true
      }

      // Select subject for the day
      const subject = subjects[subjectIndex % subjects.length]
      const syllabusForSubject = syllabi.find(s => s.subject === subject)
      
      if (!syllabusForSubject) continue

      const topics = isRevision 
        ? ['Revision of all previous topics']
        : syllabusForSubject.topics.slice(0, 3) // 2-3 topics per day

      schedule.push({
        plan_id: planId,
        date: currentDate.toISOString().split('T')[0],
        subject: isMockTest ? 'Full Mock Test' : subject,
        topics: isMockTest ? ['Complete mock test'] : topics,
        target_questions: isMockTest ? 100 : 30,
        estimated_hours: formData.hours_per_day,
        is_revision: isRevision,
        is_mock_test: isMockTest,
        is_completed: false
      })

      if (!isMockTest && !isRevision) {
        subjectIndex++
      }
    }

    // Insert schedule in batches
    const batchSize = 50
    for (let i = 0; i < schedule.length; i += batchSize) {
      const batch = schedule.slice(i, i + batchSize)
      await supabase.from('study_schedule').insert(batch)
    }
  }

  const availableExams = ['TET-1', 'TAT', 'GPSC', 'NEET', 'JEE Main']

  const calculateTotalDays = () => {
    if (!formData.exam_date) return 0
    const examDate = new Date(formData.exam_date)
    const today = new Date()
    return Math.max(0, Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const calculateTotalHours = () => {
    const days = calculateTotalDays()
    const studyDays = formData.include_weekends ? days : Math.floor(days * 5 / 7)
    return studyDays * formData.hours_per_day
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              📅 Create Study Plan
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Let's build your personalized study schedule
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Exam Selection */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Your Exam</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {availableExams.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => {
                      setSelectedExam(exam)
                      setFormData({ ...formData, exam_type: exam })
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.exam_type === exam
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <p className="font-bold text-gray-900 dark:text-white">{exam}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {exam === 'TET-1' && 'Teacher Eligibility Test - 1'}
                      {exam === 'TAT' && 'Teacher Aptitude Test'}
                      {exam === 'GPSC' && 'Gujarat Public Service Commission'}
                      {exam === 'NEET' && 'Medical Entrance Exam'}
                      {exam === 'JEE Main' && 'Engineering Entrance Exam'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Date & Hours */}
            {formData.exam_type && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Study Details</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Exam Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    {formData.exam_date && (
                      <p className="text-sm text-blue-600 mt-1">
                        {calculateTotalDays()} days remaining
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Study Hours Per Day *
                    </label>
                    <select
                      required
                      value={formData.hours_per_day}
                      onChange={(e) => setFormData({ ...formData, hours_per_day: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="2">2 hours/day</option>
                      <option value="3">3 hours/day</option>
                      <option value="4">4 hours/day</option>
                      <option value="5">5 hours/day</option>
                      <option value="6">6 hours/day</option>
                      <option value="8">8 hours/day</option>
                    </select>
                    {formData.exam_date && (
                      <p className="text-sm text-green-600 mt-1">
                        Total: {calculateTotalHours()} hours
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preparation Level
                    </label>
                    <select
                      value={formData.preparation_level}
                      onChange={(e) => setFormData({ ...formData, preparation_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="beginner">Beginner (Just started)</option>
                      <option value="intermediate">Intermediate (Some prep done)</option>
                      <option value="advanced">Advanced (Almost ready)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="weekends"
                      checked={formData.include_weekends}
                      onChange={(e) => setFormData({ ...formData, include_weekends: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="weekends" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Weekends in Study Plan
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Weak Subjects */}
            {syllabi.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weak Subjects (Optional)</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select subjects you need extra focus on. We'll allocate 20% more time to these.
                </p>

                <div className="grid md:grid-cols-2 gap-3">
                  {syllabi.map((s) => (
                    <button
                      key={s.subject}
                      type="button"
                      onClick={() => toggleWeakSubject(s.subject)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.weak_subjects.includes(s.subject)
                          ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 dark:border-gray-700 hover:border-orange-400'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{s.subject}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {s.total_questions} questions • {s.recommended_hours}h recommended
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary & Submit */}
            {formData.exam_type && formData.exam_date && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <h2 className="text-xl font-bold">Plan Summary</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-blue-100 text-sm">Total Days</p>
                    <p className="text-2xl font-bold">{calculateTotalDays()}</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Study Hours</p>
                    <p className="text-2xl font-bold">{calculateTotalHours()}h</p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Subjects</p>
                    <p className="text-2xl font-bold">{syllabi.length}</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold disabled:opacity-50"
                  >
                    {submitting ? 'Generating Plan...' : '✨ Generate My Study Plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  )
}