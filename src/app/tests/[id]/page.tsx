'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Clock, Award, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'

interface Test {
  id: string
  title: string
  description: string
  subject: string
  difficulty: string
  duration: number
  total_marks: number
  negative_marking: boolean
  language: string
  test_categories: {
    name: string
    icon: string
  }
}

export default function TestInstructionsPage() {
  const [test, setTest] = useState<Test | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string

  useEffect(() => {
    loadTestDetails()
  }, [])

  async function loadTestDetails() {
    const currentUser = await getUser()
    if (!currentUser) {
      toast.error('Please login to take the test')
      router.push('/login')
      return
    }
    setUser(currentUser)

    const { data: testData } = await supabase
      .from('tests')
      .select(`
        *,
        test_categories (
          name,
          icon
        )
      `)
      .eq('id', testId)
      .single()

    if (!testData) {
      toast.error('Test not found')
      router.push('/tests')
      return
    }

    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId)

    setTest(testData)
    setQuestionCount(count || 0)
    setLoading(false)
  }

  async function startTest() {
    if (questionCount === 0) {
      toast.error('No questions available in this test')
      return
    }

    // Create test attempt
    const { data, error } = await supabase
      .from('test_attempts')
      .insert([{
        user_id: user.id,
        test_id: testId,
        total_questions: questionCount,
        started_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      toast.error('Error starting test')
      console.error(error)
      return
    }

    // Navigate to test page
    router.push(`/tests/${testId}/take/${data.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Test not found</p>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">{test.test_categories?.icon || '📝'}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {test.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {test.test_categories?.name} • {test.language}
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              {test.description}
            </p>
          </div>

          {/* Test Details */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Test Details
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {test.duration} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Marks</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {test.total_marks}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {questionCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${test.negative_marking ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {test.negative_marking ? (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Negative Marking</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {test.negative_marking ? 'Yes (-1)' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Instructions
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Read each question carefully before selecting your answer</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You can mark questions for review and come back to them later</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>The timer will start as soon as you begin the test</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Test will auto-submit when time runs out</span>
              </li>
              {test.negative_marking && (
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 mt-1">⚠️</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Wrong answers will deduct 1 mark (Negative marking enabled)
                  </span>
                </li>
              )}
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Make sure you have a stable internet connection</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Do not refresh the page during the test</span>
              </li>
            </ul>
          </div>

          {/* Start Button */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-xl shadow-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Start?
            </h3>
            <p className="text-blue-100 mb-6">
              Make sure you have {test.duration} minutes of uninterrupted time
            </p>
            <button
              onClick={startTest}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              🚀 Start Test Now
            </button>
          </div>
        </div>
      </div>
    </>
  )
}