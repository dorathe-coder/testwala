'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { CheckCircle, XCircle, MinusCircle, Clock, TrendingUp, ThumbsUp, ThumbsDown, Bot, X, Loader } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

function CountUp({ target, duration = 1500 }: { target: number, duration?: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return <>{count}</>
}

function Confetti() {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(60)].map((_, i) => (
        <motion.div key={i} className="absolute w-3 h-3 rounded-sm"
          style={{ background: colors[i % colors.length], left: `${Math.random() * 100}%`, top: '-10px' }}
          animate={{ y: ['0vh', '110vh'], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], x: [0, (Math.random() - 0.5) * 200] }}
          transition={{ duration: 2.5 + Math.random() * 2, delay: Math.random() * 1.5, ease: 'easeIn' }} />
      ))}
    </div>
  )
}

function AIModal({ question, onClose }: { question: QuestionResult, onClose: () => void }) {
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExplanation()
  }, [])

  async function fetchExplanation() {
    // Check cache in Supabase first
    const { data: cached } = await supabase
      .from('ai_explanations')
      .select('explanation')
      .eq('question_id', question.id)
      .single()

    if (cached?.explanation) {
      setExplanation(cached.explanation)
      setLoading(false)
      return
    }

    // Call Claude API
    try {
      const response = await fetch('/api/ai-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: question.question_text,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          correct_answer: question.correct_answer,
          selected_answer: question.selected_answer,
        })
      })
      const data = await response.json()
      const exp = data.explanation || 'Explanation generate nahi ho saki.'
      setExplanation(exp)

      // Cache in Supabase
      await supabase.from('ai_explanations').upsert({
        question_id: question.id,
        explanation: exp
      }, { onConflict: 'question_id' })
    } catch (err) {
      setExplanation('Error: AI se connect nahi ho saka.')
    }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Explanation</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Question:</p>
            <p className="text-gray-900 dark:text-white">{question.question_text}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {['A','B','C','D'].map(opt => (
              <div key={opt} className={`p-3 rounded-lg text-sm border-2 ${opt === question.correct_answer ? 'border-green-500 bg-green-50 dark:bg-green-900/20 font-semibold' : opt === question.selected_answer && !question.is_correct ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <span className="font-bold">{opt})</span> {question[`option_${opt.toLowerCase()}` as keyof QuestionResult]}
                {opt === question.correct_answer && <span className="ml-1 text-green-600">✓</span>}
                {opt === question.selected_answer && !question.is_correct && <span className="ml-1 text-red-500">✗</span>}
              </div>
            ))}
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
            <p className="text-sm font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center space-x-1">
              <Bot className="w-4 h-4" /><span>AI ka Jawab:</span>
            </p>
            {loading ? (
              <div className="flex items-center space-x-2 text-purple-600">
                <Loader className="w-5 h-5 animate-spin" />
                <span>AI soch raha hai...</span>
              </div>
            ) : (
              <p className="text-purple-900 dark:text-purple-100 whitespace-pre-wrap leading-relaxed">{explanation}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ResultsPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [test, setTest] = useState<any>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showSolutions, setShowSolutions] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [aiQuestion, setAiQuestion] = useState<QuestionResult | null>(null)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const attemptId = params.attemptId as string

  useEffect(() => { loadResults() }, [])

  async function loadResults() {
    const user = await getUser()
    if (!user) { router.push('/login'); return }
    try {
      const { data: attemptData, error: attemptError } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
      if (attemptError) throw attemptError
      const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single()
      const { data: answersData } = await supabase.from('user_answers').select('*').eq('attempt_id', attemptId)
      const { data: questionsData } = await supabase.from('questions').select('*').eq('test_id', testId).order('order_number')

      let score = 0, correct_answers = 0, incorrect_answers = 0, unattempted = 0
      const marksPerQuestion = testData?.marks_per_question || 1
      const negativeMarks = testData?.negative_marks || 0
      const formattedResults: QuestionResult[] = []

      if (questionsData && answersData) {
        questionsData.forEach((question: any) => {
          const answer = answersData.find((a: any) => a.question_id === question.id)
          const selected_answer = answer?.selected_answer || null
          let is_correct = false
          if (selected_answer === null) { unattempted++ }
          else if (selected_answer === question.correct_answer) { is_correct = true; correct_answers++; score += marksPerQuestion }
          else { incorrect_answers++; if (testData?.negative_marking) score -= negativeMarks }
          formattedResults.push({ ...question, selected_answer, is_correct })
        })
      }
      score = Math.max(0, score)
      const resultData: Result = {
        score: attemptData?.score !== null ? attemptData.score : score,
        total_questions: questionsData?.length || 0,
        correct_answers: attemptData?.correct_answers !== null ? attemptData.correct_answers : correct_answers,
        incorrect_answers: attemptData?.incorrect_answers !== null ? attemptData.incorrect_answers : incorrect_answers,
        unattempted: attemptData?.unattempted !== null ? attemptData.unattempted : unattempted,
        time_taken: attemptData?.time_taken || 0
      }
      setResult(resultData)
      setTest(testData)
      setQuestionResults(formattedResults)
      const pct = testData?.total_marks > 0 ? (resultData.score / testData.total_marks) * 100 : 0
      if (pct >= 80) setTimeout(() => setShowConfetti(true), 500)
      if (!attemptData?.is_completed || attemptData?.score === null) {
        await supabase.from('test_attempts').update({ score: resultData.score, total_questions: resultData.total_questions, correct_answers: resultData.correct_answers, incorrect_answers: resultData.incorrect_answers, unattempted: resultData.unattempted, is_completed: true, completed_at: new Date().toISOString() }).eq('id', attemptId)
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0m 0s'
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  const getPercentage = () => !result || !test || test.total_marks === 0 ? 0 : Math.round((result.score / test.total_marks) * 100)
  const getGrade = () => {
    const p = getPercentage()
    if (p >= 90) return { grade: 'A+', color: 'text-green-400' }
    if (p >= 80) return { grade: 'A', color: 'text-green-400' }
    if (p >= 70) return { grade: 'B', color: 'text-blue-400' }
    if (p >= 60) return { grade: 'C', color: 'text-yellow-400' }
    if (p >= 50) return { grade: 'D', color: 'text-orange-400' }
    return { grade: 'F', color: 'text-red-400' }
  }
  const isPassed = () => result && test ? result.score >= (test.passing_marks || 0) : false
  const getAccuracy = () => {
    if (!result) return 0
    const attempted = result.correct_answers + result.incorrect_answers
    return attempted === 0 ? 0 : Math.round((result.correct_answers / attempted) * 100)
  }
  const getAttemptRate = () => !result || result.total_questions === 0 ? 0 : Math.round(((result.correct_answers + result.incorrect_answers) / result.total_questions) * 100)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  const gradeInfo = getGrade()
  const passed = isPassed()
  const percentage = getPercentage()

  return (
    <>
      <Navbar />
      {showConfetti && <Confetti />}
      <AnimatePresence>{aiQuestion && <AIModal question={aiQuestion} onClose={() => setAiQuestion(null)} />}</AnimatePresence>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">

          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Test Results 🎉</h1>
            <p className="text-gray-600 dark:text-gray-400">{test?.title}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className={`mb-8 p-6 rounded-xl shadow-lg text-center ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
            <div className="flex items-center justify-center space-x-3 mb-2">
              {passed ? <ThumbsUp className="w-12 h-12 text-white" /> : <ThumbsDown className="w-12 h-12 text-white" />}
              <h2 className="text-4xl font-bold text-white">{passed ? 'PASSED! 🎊' : 'FAILED'}</h2>
            </div>
            <p className="text-white text-lg">Passing marks: {test?.passing_marks || 0} | Your score: {result?.score || 0}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-xl shadow-lg text-center mb-8">
            <p className="text-white text-xl mb-2">Your Score</p>
            <p className="text-6xl font-bold text-white"><CountUp target={result?.score || 0} /></p>
            <p className="text-white text-2xl mt-2">out of {test?.total_marks}</p>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 inline-block mt-4">
              <p className="text-white text-lg">Percentage: <span className="font-bold text-2xl"><CountUp target={percentage} />%</span></p>
              <p className={`text-4xl font-bold mt-2 ${gradeInfo.color}`}>Grade: {gradeInfo.grade}</p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Correct', value: result?.correct_answers || 0, icon: <CheckCircle className="w-8 h-8 text-green-600" />, color: 'text-green-600' },
              { label: 'Incorrect', value: result?.incorrect_answers || 0, icon: <XCircle className="w-8 h-8 text-red-600" />, color: 'text-red-600' },
              { label: 'Unattempted', value: result?.unattempted || 0, icon: <MinusCircle className="w-8 h-8 text-gray-600" />, color: 'text-gray-600' },
              { label: 'Time Taken', value: null, icon: <Clock className="w-8 h-8 text-blue-600" />, color: 'text-blue-600', time: formatTime(result?.time_taken || 0) },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</h3>
                  {stat.icon}
                </div>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.time || <CountUp target={stat.value || 0} />}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6" /><span>Performance Analysis</span>
            </h2>
            {[{ label: 'Accuracy', value: getAccuracy(), color: 'bg-green-600' }, { label: 'Attempt Rate', value: getAttemptRate(), color: 'bg-blue-600' }].map(bar => (
              <div key={bar.label} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{bar.label}</span>
                  <span className="font-semibold">{bar.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <motion.div className={`${bar.color} h-3 rounded-full`} initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} transition={{ duration: 1, delay: 0.8 }} />
                </div>
              </div>
            ))}
          </motion.div>

          <div className="text-center mb-6">
            <button onClick={() => setShowSolutions(!showSolutions)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all hover:scale-105 active:scale-95">
              {showSolutions ? 'Hide Solutions' : 'View Solutions & Explanations'}
            </button>
          </div>

          <AnimatePresence>
            {showSolutions && questionResults.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Solutions & Explanations</h2>
                {questionResults.map((qr, index) => (
                  <motion.div key={qr.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
                    className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-2 ${qr.is_correct ? 'border-green-500' : qr.selected_answer ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">Q{index + 1}. {qr.question_text}</h3>
                      <div className="ml-4 flex-shrink-0">
                        {qr.is_correct ? <span className="flex items-center text-green-600 font-bold"><CheckCircle className="w-5 h-5 mr-1" />Correct</span>
                          : qr.selected_answer ? <span className="flex items-center text-red-600 font-bold"><XCircle className="w-5 h-5 mr-1" />Incorrect</span>
                          : <span className="flex items-center text-gray-600 font-bold"><MinusCircle className="w-5 h-5 mr-1" />Skipped</span>}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      {['A', 'B', 'C', 'D'].map((option) => (
                        <div key={option} className={`p-3 rounded-lg border-2 text-sm ${option === qr.correct_answer ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : option === qr.selected_answer && !qr.is_correct ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                          <span className="font-semibold">{option})</span> {qr[`option_${option.toLowerCase()}` as keyof QuestionResult]}
                          {option === qr.correct_answer && <span className="ml-1 text-green-600 font-bold">✓</span>}
                          {option === qr.selected_answer && !qr.is_correct && <span className="ml-1 text-red-600 font-bold">✗</span>}
                        </div>
                      ))}
                    </div>
                    {qr.explanation && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Explanation:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-300">{qr.explanation}</p>
                      </div>
                    )}
                    {/* AI Button */}
                    <button onClick={() => setAiQuestion(qr)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 font-medium text-sm transition-all hover:scale-105">
                      <Bot className="w-4 h-4" />
                      <span>🤖 AI se Samjho</span>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center space-x-4">
            <Link href="/tests" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all hover:scale-105 active:scale-95">Browse More Tests</Link>
            <Link href="/dashboard" className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95">Go to Dashboard</Link>
          </div>
        </div>
      </div>
    </>
  )
}