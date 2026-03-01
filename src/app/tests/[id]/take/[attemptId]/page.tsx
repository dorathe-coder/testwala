'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import toast from 'react-hot-toast'
import { Clock, Flag, ChevronLeft, ChevronRight, Send, Grid, Calculator, Maximize, Minimize, X } from 'lucide-react'

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
  visited: boolean
}

function CalculatorWidget({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState('')
  const [op, setOp] = useState('')
  const [fresh, setFresh] = useState(true)

  const press = (val: string) => {
    if (val === 'C') { setDisplay('0'); setPrev(''); setOp(''); setFresh(true); return }
    if (val === '±') { setDisplay(d => String(-parseFloat(d))); return }
    if (val === '%') { setDisplay(d => String(parseFloat(d) / 100)); return }
    if (val === '=') {
      if (!op || !prev) return
      const a = parseFloat(prev), b = parseFloat(display)
      let r = 0
      if (op === '+') r = a + b
      else if (op === '-') r = a - b
      else if (op === '×') r = a * b
      else if (op === '÷') r = b !== 0 ? a / b : 0
      setDisplay(String(parseFloat(r.toFixed(10))))
      setPrev(''); setOp(''); setFresh(true); return
    }
    if (['+', '-', '×', '÷'].includes(val)) { setPrev(display); setOp(val); setFresh(true); return }
    if (val === '.') {
      if (fresh) { setDisplay('0.'); setFresh(false); return }
      if (!display.includes('.')) setDisplay(d => d + '.')
      return
    }
    if (fresh) { setDisplay(val); setFresh(false) }
    else setDisplay(d => d === '0' ? val : d + val)
  }

  const btns = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=']

  return (
    <div className="fixed bottom-24 right-6 z-50 bg-gray-900 rounded-2xl shadow-2xl p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold">Calculator</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="bg-gray-800 rounded-xl p-3 mb-3 text-right">
        <p className="text-gray-400 text-xs h-4">{prev} {op}</p>
        <p className="text-white text-3xl font-light truncate">{display}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {btns.map((btn) => (
          <button key={btn} onClick={() => press(btn)}
            className={`py-3 rounded-xl font-semibold text-lg transition-all active:scale-95 ${
              btn === '=' ? 'col-span-1 bg-orange-500 text-white hover:bg-orange-400' :
              ['÷','×','-','+'].includes(btn) ? 'bg-orange-500/80 text-white hover:bg-orange-400' :
              ['C','±','%'].includes(btn) ? 'bg-gray-600 text-white hover:bg-gray-500' :
              'bg-gray-700 text-white hover:bg-gray-600'
            } ${btn === '0' ? 'col-span-2' : ''}`}>
            {btn}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TakeTestPage() {
  const [test, setTest] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPalette, setShowPalette] = useState(true)
  const [showCalc, setShowCalc] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const attemptId = params.attemptId as string
  const autoSaveRef = useRef<NodeJS.Timeout>()

  useEffect(() => { loadTestData() }, [])

  useEffect(() => {
    if (timeRemaining <= 0) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { handleAutoSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeRemaining])

  // Auto-save every 15 seconds
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => { autoSave() }, 15000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [answers])

  async function autoSave() {
    try {
      const answersToSave = Object.values(answers)
        .filter(a => a.selectedAnswer)
        .map(a => ({ attempt_id: attemptId, question_id: a.questionId, selected_answer: a.selectedAnswer, is_correct: false, marks_obtained: 0 }))
      if (answersToSave.length === 0) return
      await supabase.from('user_answers').upsert(answersToSave, { onConflict: 'attempt_id,question_id' })
      toast.success('Auto-saved ✓', { duration: 1500, icon: '💾' })
    } catch (e) { console.error('Auto-save error:', e) }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  async function loadTestData() {
    const user = await getUser()
    if (!user) { router.push('/login'); return }
    const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single()
    const { data: questionsData } = await supabase.from('questions').select('*').eq('test_id', testId).order('order_number')
    if (!testData || !questionsData || questionsData.length === 0) { toast.error('Test data not found'); router.push('/tests'); return }
    setTest(testData)
    setQuestions(questionsData)
    setTimeRemaining(testData.duration * 60)
    const initialAnswers: Record<string, Answer> = {}
    questionsData.forEach((q) => { initialAnswers[q.id] = { questionId: q.id, selectedAnswer: null, marked: false, visited: false } })

    // Load any previously auto-saved answers
    const { data: savedAnswers } = await supabase.from('user_answers').select('*').eq('attempt_id', attemptId)
    if (savedAnswers && savedAnswers.length > 0) {
      savedAnswers.forEach((sa: any) => {
        if (initialAnswers[sa.question_id]) {
          initialAnswers[sa.question_id].selectedAnswer = sa.selected_answer
        }
      })
      toast.success('Previous answers restored!', { icon: '🔄' })
    }

    setAnswers(initialAnswers)
    setLoading(false)
  }

  function selectAnswer(answer: string) {
    const q = questions[currentQuestionIndex]
    setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], selectedAnswer: answer } }))
  }

  function toggleMark() {
    const q = questions[currentQuestionIndex]
    setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], marked: !prev[q.id].marked } }))
  }

  function goToQuestion(index: number) {
    const prev = questions[currentQuestionIndex]
    setAnswers(p => ({ ...p, [prev.id]: { ...p[prev.id], visited: true } }))
    setCurrentQuestionIndex(index)
  }

  function nextQuestion() { if (currentQuestionIndex < questions.length - 1) goToQuestion(currentQuestionIndex + 1) }
  function previousQuestion() { if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1) }
  async function handleAutoSubmit() { toast.error('Time is up! Auto-submitting...'); await submitTest() }

  async function handleSubmit() {
    const unanswered = Object.values(answers).filter(a => !a.selectedAnswer).length
    if (unanswered > 0) { if (!confirm(`${unanswered} questions unanswered. Submit?`)) return }
    else { if (!confirm('Submit the test?')) return }
    await submitTest()
  }

  async function submitTest() {
    if (submitting) return
    setSubmitting(true)
    try {
      let correct = 0, incorrect = 0, unattempted = 0, score = 0
      const marksPerQuestion = test.marks_per_question || 1
      const negativeMarks = test.negative_marks || 0
      const userAnswers = []

      for (const question of questions) {
        const answer = answers[question.id]
        if (!answer?.selectedAnswer) {
          unattempted++
          userAnswers.push({ attempt_id: attemptId, question_id: question.id, selected_answer: null, is_correct: false, marks_obtained: 0 })
        } else {
          const isCorrect = answer.selectedAnswer === question.correct_answer
          if (isCorrect) {
            correct++; score += marksPerQuestion
            userAnswers.push({ attempt_id: attemptId, question_id: question.id, selected_answer: answer.selectedAnswer, is_correct: true, marks_obtained: marksPerQuestion })
          } else {
            incorrect++
            const penalty = test.negative_marking ? negativeMarks : 0
            score -= penalty
            userAnswers.push({ attempt_id: attemptId, question_id: question.id, selected_answer: answer.selectedAnswer, is_correct: false, marks_obtained: -penalty })
          }
        }
      }

      score = Math.max(0, score)
      const timeTaken = Math.max(0, (test.duration * 60) - timeRemaining)

      await supabase.from('user_answers').delete().eq('attempt_id', attemptId)
      for (let i = 0; i < userAnswers.length; i += 10) {
        const { error } = await supabase.from('user_answers').insert(userAnswers.slice(i, i + 10))
        if (error) throw error
      }

      const { error } = await supabase.from('test_attempts').update({
        score, total_questions: questions.length, correct_answers: correct,
        incorrect_answers: incorrect, unattempted, time_taken: timeTaken,
        completed_at: new Date().toISOString(), is_completed: true
      }).eq('id', attemptId)
      if (error) throw error

      // XP aur Badges
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await fetch('/api/award-xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, score, total_marks: test.total_marks, time_taken: timeTaken, test_duration: test.duration })
          })
        }
      } catch (e) { console.error('XP error:', e) }

      if (document.fullscreenElement) document.exitFullscreen()
      toast.success('Test submitted!')
      await new Promise(r => setTimeout(r, 1000))
      router.push(`/tests/${testId}/results/${attemptId}`)
    } catch (error) { console.error(error); toast.error('Error submitting. Try again.'); setSubmitting(false) }
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  const getQuestionStatus = (questionId: string) => {
    const a = answers[questionId]
    if (!a) return 'unvisited'
    if (a.marked && a.selectedAnswer) return 'marked-answered'
    if (a.marked) return 'marked'
    if (a.selectedAnswer) return 'answered'
    if (a.visited) return 'visited'
    return 'unvisited'
  }

  const statusStyle: Record<string, string> = {
    'answered': 'bg-green-500 text-white',
    'marked': 'bg-yellow-400 text-white',
    'marked-answered': 'bg-purple-500 text-white',
    'visited': 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white',
    'unvisited': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300',
  }

  const counts = {
    answered: Object.values(answers).filter(a => a.selectedAnswer && !a.marked).length,
    marked: Object.values(answers).filter(a => a.marked && !a.selectedAnswer).length,
    markedAnswered: Object.values(answers).filter(a => a.marked && a.selectedAnswer).length,
    unanswered: Object.values(answers).filter(a => !a.selectedAnswer && !a.marked).length,
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  if (!test || questions.length === 0) return <div className="min-h-screen flex items-center justify-center"><button onClick={() => router.push('/tests')} className="px-6 py-3 bg-blue-600 text-white rounded-lg">Back to Tests</button></div>

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {showCalc && <CalculatorWidget onClose={() => setShowCalc(false)} />}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{test?.title}</h1>
            <p className="text-xs text-gray-500">Q {currentQuestionIndex + 1} / {questions.length}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
              <Clock className="w-5 h-5" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <button onClick={() => setShowCalc(!showCalc)} title="Calculator"
              className={`p-2 rounded-lg transition-all ${showCalc ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100'}`}>
              <Calculator className="w-5 h-5" />
            </button>
            <button onClick={toggleFullscreen} title="Fullscreen"
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-lg">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowPalette(!showPalette)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg lg:hidden">
              <Grid className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Question Panel */}
        <div className="flex-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                Q{currentQuestionIndex + 1}. {currentQuestion?.question_text}
              </h2>
              <span className="ml-4 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full text-sm font-medium whitespace-nowrap">
                {test?.marks_per_question || 1} marks
              </span>
            </div>
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => (
                <button key={option} onClick={() => selectAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:scale-[1.01] ${currentAnswer?.selectedAnswer === option ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold text-sm ${currentAnswer?.selectedAnswer === option ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 text-gray-500'}`}>
                      {option}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 mt-0.5">
                      {currentQuestion?.[`option_${option.toLowerCase()}` as keyof Question]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button onClick={previousQuestion} disabled={currentQuestionIndex === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 disabled:opacity-40">
              <ChevronLeft className="w-5 h-5" /><span>Prev</span>
            </button>
            <button onClick={toggleMark}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${currentAnswer?.marked ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100'}`}>
              <Flag className="w-4 h-4" /><span>{currentAnswer?.marked ? 'Unmark' : 'Mark Review'}</span>
            </button>
            <button onClick={nextQuestion} disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
              <span>Next</span><ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Palette */}
        <div className={`w-72 flex-shrink-0 ${showPalette ? 'block' : 'hidden'} lg:block`}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 sticky top-24">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Question Palette</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[
                  { color: 'bg-green-500', label: 'Answered', count: counts.answered },
                  { color: 'bg-red-100 border border-red-300', label: 'Not Visited', count: counts.unanswered },
                  { color: 'bg-yellow-400', label: 'Marked', count: counts.marked },
                  { color: 'bg-purple-500', label: 'Marked+Ans', count: counts.markedAnswered },
                ].map(item => (
                  <div key={item.label} className="flex items-center space-x-1">
                    <div className={`w-4 h-4 rounded ${item.color} flex-shrink-0`}></div>
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="ml-auto font-bold text-gray-900 dark:text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto">
                {questions.map((q, index) => {
                  const status = getQuestionStatus(q.id)
                  const isCurrent = index === currentQuestionIndex
                  return (
                    <button key={q.id} onClick={() => goToQuestion(index)}
                      className={`w-11 h-11 rounded-lg font-semibold text-sm transition-all ${statusStyle[status]} ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'}`}>
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                <Send className="w-5 h-5" />
                <span>{submitting ? 'Submitting...' : 'Submit Test'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}