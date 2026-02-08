'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Copy, CheckCircle } from 'lucide-react'

interface Test {
  id: string
  title: string
  subject: string
  language: string
  test_categories: {
    name: string
    icon: string
  } | null
}

export default function ClonePage() {
  const [currentTest, setCurrentTest] = useState<any>(null)
  const [availableTests, setAvailableTests] = useState<Test[]>([])
  const [selectedTestId, setSelectedTestId] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState(false)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    const user = await getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // Load current test
    const { data: currentTestData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    // Load all other tests
    const { data: testsData } = await supabase
      .from('tests')
      .select(`
        id,
        title,
        subject,
        language,
        test_categories (
          name,
          icon
        )
      `)
      .neq('id', testId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setCurrentTest(currentTestData)
    setAvailableTests((testsData as Test[]) || [])
    setLoading(false)
  }

  async function loadQuestionCount(testId: string) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId)

    setQuestionCount(count || 0)
  }

  async function handleClone() {
    if (!selectedTestId) {
      toast.error('Please select a test to clone from')
      return
    }

    if (questionCount === 0) {
      toast.error('Selected test has no questions')
      return
    }

    if (!confirm(`Clone ${questionCount} questions from selected test?`)) {
      return
    }

    setCloning(true)
    toast.loading('Cloning questions...')

    // Get questions from selected test
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', selectedTestId)
      .order('order_number')

    if (!questionsData || questionsData.length === 0) {
      toast.error('No questions found')
      setCloning(false)
      return
    }

    // Get current question count for order numbers
    const { count: currentCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId)

    // Clone questions to current test
    const questionsToInsert = questionsData.map((q, index) => ({
      test_id: testId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      marks: q.marks,
      question_image: q.question_image,
      solution_image: q.solution_image,
      order_number: (currentCount || 0) + index + 1
    }))

    const { error } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (error) {
      toast.error('Error cloning questions')
      console.error(error)
      setCloning(false)
      return
    }

    toast.success(`${questionCount} questions cloned successfully!`)
    
    setTimeout(() => {
      router.push(`/admin/tests/${testId}/questions/view`)
    }, 1500)
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
            <button 
              onClick={() => router.push(`/admin/tests/${testId}/questions`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              ← Back to Import Methods
            </button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Copy className="w-10 h-10 text-teal-600" />
              <span>Clone from Another Test</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Copy questions from an existing test to: {currentTest?.title}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Select Test to Clone From
            </h2>

            {availableTests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No other tests available to clone from
                </p>
                <button
                  onClick={() => router.push('/admin/tests/create')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create New Test
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableTests.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => {
                      setSelectedTestId(test.id)
                      loadQuestionCount(test.id)
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTestId === test.id
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{test.test_categories?.icon || '📝'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {test.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {test.test_categories?.name} • {test.subject} • {test.language}
                          </p>
                        </div>
                      </div>
                      {selectedTestId === test.id && (
                        <CheckCircle className="w-6 h-6 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedTestId && questionCount > 0 && (
              <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                <p className="text-teal-900 dark:text-teal-200 font-medium">
                  📋 This test has <strong>{questionCount} questions</strong> that will be cloned
                </p>
              </div>
            )}

            {selectedTestId && questionCount === 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-900 dark:text-yellow-200">
                  ⚠️ Selected test has no questions
                </p>
              </div>
            )}

            {selectedTestId && questionCount > 0 && (
              <button
                onClick={handleClone}
                disabled={cloning}
                className="w-full mt-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50"
              >
                {cloning ? 'Cloning...' : `Clone ${questionCount} Questions`}
              </button>
            )}
          </div>

          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 How it works:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Select a test from the list above</li>
              <li>• All questions from that test will be copied</li>
              <li>• Questions will be added to your current test</li>
              <li>• Original test remains unchanged</li>
              <li>• You can edit cloned questions later</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}