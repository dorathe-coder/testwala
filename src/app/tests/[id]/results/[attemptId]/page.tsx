'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { CheckCircle, XCircle, MinusCircle, Clock, Award, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Result {
  score: number
  total_questions: number
  correct_answers: number
  incorrect_answers: number
  unattempted: number
  time_taken: number
}

interface QuestionResult {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  marks: number
  selected_answer: string | null
  is_correct: boolean
  order_number: number
}

export default function ResultsPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [test, setTest] = useState<any>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showSolutions, setShowSolutions] = useState(false)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const attemptId = params.attemptId as string

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    const user = await getUser()
    if (!user) {
      router.push('/login')
      return
    }

    console.log('Loading results for attempt:', attemptId)

    try {
      // Load test attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single()

      if (attemptError) {
        console.error('Error loading attempt:', attemptError)
        throw attemptError
      }

      console.log('Attempt data loaded:', attemptData)

      // Load test details
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      console.log('Test data loaded:', testData)

      // Load user answers
      const { data: answersData } = await supabase
        .from('user_answers')
        .select('*')
        .eq('attempt_id', attemptId)

      console.log('Answers loaded:', answersData)

      // Load questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_number')

      console.log('Questions loaded:', questionsData)

      // Calculate results manually from answers
      let score = 0
      let correct_answers = 0
      let incorrect_answers = 0
      let unattempted = 0
      
      const marksPerQuestion = testData?.marks_per_question || 1
      const negativeMarks = testData?.negative_marks || 0
      const formattedResults: QuestionResult[] = []

      if (questionsData && answersData) {
        questionsData.forEach((question: any) => {
          const answer = answersData.find((a: any) => a.question_id === question.id)
          const selected_answer = answer?.selected_answer || null
          
          let is_correct = false
          
          if (selected_answer === null) {
            unattempted++
          } else if (selected_answer === question.correct_answer) {
            is_correct = true
            correct_answers++
            score += marksPerQuestion
          } else {
            incorrect_answers++
            if (testData?.negative_marking) {
              score -= negativeMarks
            }
          }

          formattedResults.push({
            ...question,
            selected_answer: selected_answer,
            is_correct: is_correct
          })
        })
      }

      // Ensure score doesn't go below 0
      score = Math.max(0, score)

      // If attempt data doesn't have results, calculate them
      const resultData: Result = {
        score: attemptData?.score !== null ? attemptData.score : score,
        total_questions: questionsData?.length || 0,
        correct_answers: attemptData?.correct_answers !== null ? attemptData.correct_answers : correct_answers,
        incorrect_answers: attemptData?.incorrect_answers !== null ? attemptData.incorrect_answers : incorrect_answers,
        unattempted: attemptData?.unattempted !== null ? attemptData.unattempted : unattempted,
        time_taken: attemptData?.time_taken || 0
      }

      console.log('Final result data:', resultData)
      console.log('Formatted results:', formattedResults)

      setResult(resultData)
      setTest(testData)
      setQuestionResults(formattedResults)

      // If attempt data is incomplete, update it in database
      if (!attemptData?.is_completed || attemptData?.score === null) {
        await supabase
          .from('test_attempts')
          .update({
            score: resultData.score,
            total_questions: resultData.total_questions,
            correct_answers: resultData.correct_answers,
            incorrect_answers: resultData.incorrect_answers,
            unattempted: resultData.unattempted,
            is_completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', attemptId)
      }

    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getPercentage = () => {
    if (!result || !test || test.total_marks === 0) return 0
    return Math.round((result.score / test.total_marks) * 100)
  }

  const getGrade = () => {
    const percentage = getPercentage()
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' }
    if (percentage >= 80) return { grade: 'A', color: 'text-green-600' }
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-600' }
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-600' }
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-600' }
    return { grade: 'F', color: 'text-red-600' }
  }

  const isPassed = () => {
    if (!result || !test) return false
    return result.score >= (test.passing_marks || 0)
  }

  // Calculate accuracy correctly
  const getAccuracy = () => {
    if (!result || result.total_questions === 0) return 0
    const attempted = result.correct_answers + result.incorrect_answers
    if (attempted === 0) return 0
    return Math.round((result.correct_answers / attempted) * 100)
  }

  // Calculate attempt rate
  const getAttemptRate = () => {
    if (!result || result.total_questions === 0) return 0
    const attempted = result.correct_answers + result.incorrect_answers
    return Math.round((attempted / result.total_questions) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const gradeInfo = getGrade()
  const accuracy = getAccuracy()
  const attemptRate = getAttemptRate()
  const passed = isPassed()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Test Results 🎉
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {test?.title}
            </p>
          </div>

          {/* Pass/Fail Banner */}
          <div className={`mb-8 p-6 rounded-xl shadow-lg text-center ${
            passed 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-rose-600'
          }`}>
            <div className="flex items-center justify-center space-x-3 mb-2">
              {passed ? (
                <ThumbsUp className="w-12 h-12 text-white" />
              ) : (
                <ThumbsDown className="w-12 h-12 text-white" />
              )}
              <h2 className="text-4xl font-bold text-white">
                {passed ? 'PASSED!' : 'FAILED'}
              </h2>
            </div>
            <p className="text-white text-lg">
              Passing marks: {test?.passing_marks || 0} | Your score: {result?.score || 0}
            </p>
          </div>

          {/* Score Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-xl shadow-lg text-center mb-8">
            <div className="text-white mb-4">
              <p className="text-xl mb-2">Your Score</p>
              <p className="text-6xl font-bold">{result?.score || 0}</p>
              <p className="text-2xl mt-2">out of {test?.total_marks}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 inline-block">
              <p className="text-white text-lg">
                Percentage: <span className="font-bold text-2xl">{getPercentage()}%</span>
              </p>
              <p className={`text-4xl font-bold mt-2 ${gradeInfo.color}`}>
                Grade: {gradeInfo.grade}
              </p>
            </div>
          </div>

          {/* Marking Information */}
          {test && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-8 border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Marking Scheme:</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Correct Answer:</span> +{test.marks_per_question || 1} marks
                </div>
                <div className="text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Wrong Answer:</span> {test.negative_marking ? `-${test.negative_marks}` : '0'} marks
                </div>
                <div className="text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Unattempted:</span> 0 marks
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Correct</h3>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{result?.correct_answers || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result?.total_questions ? Math.round((result.correct_answers / result.total_questions) * 100) : 0}% of total
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Incorrect</h3>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{result?.incorrect_answers || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result?.total_questions ? Math.round((result.incorrect_answers / result.total_questions) * 100) : 0}% of total
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Unattempted</h3>
                <MinusCircle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-600">{result?.unattempted || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result?.total_questions ? Math.round((result.unattempted / result.total_questions) * 100) : 0}% of total
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Taken</h3>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{formatTime(result?.time_taken || 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {test?.duration || 0}min
              </p>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6" />
              <span>Performance Analysis</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300">Accuracy</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {accuracy}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{ width: `${accuracy}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of correct answers among attempted questions
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300">Attempt Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {attemptRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${attemptRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage of questions attempted
                </p>
              </div>
            </div>
          </div>

          {/* Solutions Toggle */}
          <div className="text-center mb-6">
            <button
              onClick={() => setShowSolutions(!showSolutions)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {showSolutions ? 'Hide Solutions' : 'View Solutions & Explanations'}
            </button>
          </div>

          {/* Solutions */}
          {showSolutions && questionResults.length > 0 && (
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Solutions & Explanations
              </h2>
              
              {questionResults.map((qr, index) => (
                <div
                  key={qr.id}
                  className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-2 ${
                    qr.is_correct
                      ? 'border-green-500'
                      : qr.selected_answer
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                      Q{index + 1}. {qr.question_text}
                    </h3>
                    <div className="ml-4 flex flex-col items-end">
                      {qr.is_correct ? (
                        <>
                          <span className="flex items-center text-green-600 font-bold mb-1">
                            <CheckCircle className="w-6 h-6 mr-1" /> Correct
                          </span>
                          <span className="text-sm text-green-600">
                            +{test?.marks_per_question || 1} marks
                          </span>
                        </>
                      ) : qr.selected_answer ? (
                        <>
                          <span className="flex items-center text-red-600 font-bold mb-1">
                            <XCircle className="w-6 h-6 mr-1" /> Incorrect
                          </span>
                          <span className="text-sm text-red-600">
                            {test?.negative_marking ? `-${test.negative_marks}` : '0'} marks
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center text-gray-600 font-bold mb-1">
                            <MinusCircle className="w-6 h-6 mr-1" /> Not Attempted
                          </span>
                          <span className="text-sm text-gray-600">
                            0 marks
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mb-4">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <div
                        key={option}
                        className={`p-3 rounded-lg border-2 ${
                          option === qr.correct_answer
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : option === qr.selected_answer && !qr.is_correct
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <span className="font-semibold">{option})</span> {qr[`option_${option.toLowerCase()}` as keyof QuestionResult]}
                        {option === qr.correct_answer && (
                          <span className="ml-2 text-green-600 font-bold">✓ Correct Answer</span>
                        )}
                        {option === qr.selected_answer && !qr.is_correct && (
                          <span className="ml-2 text-red-600 font-bold">✗ Your Answer</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {qr.explanation && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                        Explanation:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {qr.explanation}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Your Answer: {qr.selected_answer || 'Not Attempted'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Correct Answer: {qr.correct_answer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Link
              href="/tests"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse More Tests
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}