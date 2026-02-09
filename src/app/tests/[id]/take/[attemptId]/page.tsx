'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import toast from 'react-hot-toast'
import { Clock, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  marks: number
  order_number: number
}

interface Answer {
  questionId: string
  selectedAnswer: string | null
  marked: boolean
}

export default function TakeTestPage() {
  const [test, setTest] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const attemptId = params.attemptId as string

  useEffect(() => {
    loadTestData()
  }, [])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  async function loadTestData() {
    const user = await getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('order_number')

    if (!testData || !questionsData || questionsData.length === 0) {
      toast.error('Test data not found')
      router.push('/tests')
      return
    }

    setTest(testData)
    setQuestions(questionsData)
    setTimeRemaining(testData.duration * 60)

    // Initialize answers
    const initialAnswers: Record<string, Answer> = {}
    questionsData.forEach((q) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        selectedAnswer: null,
        marked: false
      }
    })
    setAnswers(initialAnswers)
    setLoading(false)
  }

  function selectAnswer(answer: string) {
    const currentQuestion = questions[currentQuestionIndex]
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        selectedAnswer: answer
      }
    })
  }

  function toggleMark() {
    const currentQuestion = questions[currentQuestionIndex]
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        marked: !answers[currentQuestion.id].marked
      }
    })
  }

  function goToQuestion(index: number) {
    setCurrentQuestionIndex(index)
  }

  function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  function previousQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  async function handleAutoSubmit() {
    toast.error('Time is up! Auto-submitting test...')
    await submitTest()
  }

  async function handleSubmit() {
    const unanswered = Object.values(answers).filter(a => !a.selectedAnswer).length
    
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`)) {
        return
      }
    } else {
      if (!confirm('Are you sure you want to submit the test?')) {
        return
      }
    }

    await submitTest()
  }

  async function submitTest() {
    if (submitting) return
    setSubmitting(true)
    
    try {
      // Calculate score with new marking system
      let correct = 0
      let incorrect = 0
      let unattempted = 0
      let score = 0

      const userAnswers = []
      
      // Get marks per question and negative marks from test
      const marksPerQuestion = test.marks_per_question || 1
      const negativeMarks = test.negative_marks || 0

      for (const question of questions) {
        const answer = answers[question.id]
        
        if (!answer?.selectedAnswer) {
          unattempted++
          userAnswers.push({
            attempt_id: attemptId,
            question_id: question.id,
            selected_answer: null,
            is_correct: false,
            marks_obtained: 0
          })
        } else {
          const isCorrect = answer.selectedAnswer === question.correct_answer

          if (isCorrect) {
            correct++
            score += marksPerQuestion
            userAnswers.push({
              attempt_id: attemptId,
              question_id: question.id,
              selected_answer: answer.selectedAnswer,
              is_correct: true,
              marks_obtained: marksPerQuestion
            })
          } else {
            incorrect++
            // Apply negative marking if enabled
            const penaltyMarks = test.negative_marking ? negativeMarks : 0
            score -= penaltyMarks
            
            userAnswers.push({
              attempt_id: attemptId,
              question_id: question.id,
              selected_answer: answer.selectedAnswer,
              is_correct: false,
              marks_obtained: -penaltyMarks
            })
          }
        }
      }

      // Ensure score doesn't go below 0
      score = Math.max(0, score)

      console.log('Calculated Results:', {
        score,
        correct,
        incorrect,
        unattempted,
        total_questions: questions.length,
        marksPerQuestion,
        negativeMarks
      })

      // First, delete any existing answers for this attempt to avoid duplicates
      const { error: deleteError } = await supabase
        .from('user_answers')
        .delete()
        .eq('attempt_id', attemptId)

      if (deleteError) {
        console.error('Error deleting existing answers:', deleteError)
      }

      // Save user answers in batches
      const batchSize = 10
      for (let i = 0; i < userAnswers.length; i += batchSize) {
        const batch = userAnswers.slice(i, i + batchSize)
        const { error: answersError } = await supabase
          .from('user_answers')
          .insert(batch)

        if (answersError) {
          console.error('Error saving answers batch:', answersError)
          throw answersError
        }
      }

      // Update test attempt with calculated results
      const timeTaken = (test.duration * 60) - timeRemaining
      
      const updateData = {
        score: score,
        total_questions: questions.length,
        correct_answers: correct,
        incorrect_answers: incorrect,
        unattempted: unattempted,
        time_taken: timeTaken,
        completed_at: new Date().toISOString(),
        is_completed: true
      }

      console.log('Updating attempt with:', updateData)

      const { error: updateError } = await supabase
        .from('test_attempts')
        .update(updateData)
        .eq('id', attemptId)

      if (updateError) {
        console.error('Error updating attempt:', updateError)
        throw updateError
      }

      console.log('Test submitted successfully!')
      toast.success('Test submitted successfully!')
      
      // Wait a moment for the database to update
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to results page
      router.push(`/tests/${testId}/results/${attemptId}`)

    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Error submitting test. Please try again.')
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getQuestionStatus = (questionId: string) => {
    const answer = answers[questionId]
    if (answer?.marked) return 'marked'
    if (answer?.selectedAnswer) return 'answered'
    return 'unanswered'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-green-600 text-white'
      case 'marked': return 'bg-yellow-600 text-white'
      default: return 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No questions available</p>
          <button
            onClick={() => router.push('/tests')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {test?.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-lg ${
                timeRemaining < 300 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              }`}>
                <Clock className="w-5 h-5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>{submitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Q{currentQuestionIndex + 1}. {currentQuestion?.question_text}
                </h2>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                  {test?.marks_per_question || 1} marks
                </span>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <button
                    key={option}
                    onClick={() => selectAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      currentAnswer?.selectedAnswer === option
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        currentAnswer?.selectedAnswer === option
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-400'
                      }`}>
                        {currentAnswer?.selectedAnswer === option && '✓'}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{option})</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">
                          {currentQuestion?.[`option_${option.toLowerCase()}` as keyof Question]}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={toggleMark}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    currentAnswer?.marked
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300'
                  }`}
                >
                  <Flag className="w-5 h-5" />
                  <span>{currentAnswer?.marked ? 'Unmark' : 'Mark for Review'}</span>
                </button>

                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 sticky top-24">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Question Navigator</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`w-10 h-10 rounded-lg font-medium text-sm ${
                      index === currentQuestionIndex
                        ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-800'
                        : ''
                    } ${getStatusColor(getQuestionStatus(q.id))}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Answered</span>
                  <span className="ml-auto font-semibold">{Object.values(answers).filter(a => a.selectedAnswer && !a.marked).length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Marked</span>
                  <span className="ml-auto font-semibold">{Object.values(answers).filter(a => a.marked).length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Unanswered</span>
                  <span className="ml-auto font-semibold">{Object.values(answers).filter(a => !a.selectedAnswer).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}