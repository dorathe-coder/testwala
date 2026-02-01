'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Copy, CheckCircle, AlertCircle } from 'lucide-react'

interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  marks: number
}

export default function BulkPastePage() {
  const [test, setTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [textInput, setTextInput] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<'input' | 'preview' | 'complete'>('input')
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string

  const sampleFormat = `Q1. What is the capital of India?
A) Mumbai
B) Delhi
C) Kolkata
D) Chennai
Answer: B
Explanation: Delhi is the capital and New Delhi is the seat of government.
Marks: 4

Q2. What is 2+2?
A) 2
B) 3
C) 4
D) 5
Answer: C
Explanation: Basic addition
Marks: 4`

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

    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    setTest(testData)
    setLoading(false)
  }

  function parseText() {
    if (!textInput.trim()) {
      toast.error('Please paste some questions')
      return
    }

    setProcessing(true)

    try {
      const questions: ParsedQuestion[] = []
      
      // Split by question numbers (Q1., Q2., etc.)
      const questionBlocks = textInput.split(/Q\d+\.\s+/).filter(block => block.trim())

      questionBlocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        
        if (lines.length < 6) return // Not enough data for a question

        const questionText = lines[0]
        const options = lines.filter(l => /^[A-D]\)/.test(l))
        const answerLine = lines.find(l => l.toLowerCase().startsWith('answer:'))
        const explanationLine = lines.find(l => l.toLowerCase().startsWith('explanation:'))
        const marksLine = lines.find(l => l.toLowerCase().startsWith('marks:'))

        if (!questionText || options.length !== 4 || !answerLine) return

        const option_a = options[0]?.replace(/^A\)\s*/, '') || ''
        const option_b = options[1]?.replace(/^B\)\s*/, '') || ''
        const option_c = options[2]?.replace(/^C\)\s*/, '') || ''
        const option_d = options[3]?.replace(/^D\)\s*/, '') || ''
        
        const correct_answer = answerLine.replace(/answer:\s*/i, '').trim().toUpperCase()
        const explanation = explanationLine?.replace(/explanation:\s*/i, '').trim() || ''
        const marks = marksLine ? parseInt(marksLine.replace(/marks:\s*/i, '').trim()) : 4

        questions.push({
          question_text: questionText,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation,
          marks
        })
      })

      if (questions.length === 0) {
        toast.error('No valid questions found. Please check format.')
        setProcessing(false)
        return
      }

      setParsedQuestions(questions)
      setStep('preview')
      toast.success(`${questions.length} questions parsed successfully!`)
    } catch (error) {
      toast.error('Error parsing text. Please check format.')
      console.error(error)
    }

    setProcessing(false)
  }

  async function saveQuestions() {
    setProcessing(true)
    toast.loading('Saving questions...')

    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', testId)

    const questionsToInsert = parsedQuestions.map((q, index) => ({
      test_id: testId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      marks: q.marks,
      order_number: (count || 0) + index + 1
    }))

    const { error } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (error) {
      toast.error('Error saving questions')
      console.error(error)
      setProcessing(false)
      return
    }

    toast.success('All questions saved!')
    setStep('complete')
    setProcessing(false)
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <button 
              onClick={() => router.push(`/admin/tests/${testId}/questions`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              ← Back to Import Methods
            </button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <Copy className="w-10 h-10 text-orange-600" />
              <span>Bulk Paste Import</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Copy questions in text format and paste to import
            </p>
          </div>

          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Input Area */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Paste Your Questions
                </h2>
                
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Paste your questions here in the format shown on the right..."
                />

                <button
                  onClick={parseText}
                  disabled={processing || !textInput.trim()}
                  className="w-full mt-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Parse Questions'}
                </button>
              </div>

              {/* Right: Format Guide */}
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Required Format:</span>
                  </h3>
                  <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                    <p><strong>Each question must have:</strong></p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Question number (Q1., Q2., etc.)</li>
                      <li>Question text</li>
                      <li>4 options (A), B), C), D))</li>
                      <li>Answer: A/B/C/D</li>
                      <li>Explanation: (optional)</li>
                      <li>Marks: (optional, default 4)</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Example Format:
                    </h3>
                    <button
                      onClick={() => setTextInput(sampleFormat)}
                      className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded hover:bg-blue-200"
                    >
                      Use Sample
                    </button>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                    {sampleFormat}
                  </pre>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    💡 Tips:
                  </h4>
                  <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                    <li>• Leave blank line between questions</li>
                    <li>• Options must start with A), B), C), D)</li>
                    <li>• Answer must be single letter (A/B/C/D)</li>
                    <li>• You can paste 50+ questions at once!</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Preview Questions ({parsedQuestions.length})
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {parsedQuestions.slice(0, 5).map((q, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">
                      Q{index + 1}. {q.question_text}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <p>A) {q.option_a}</p>
                      <p>B) {q.option_b}</p>
                      <p>C) {q.option_c}</p>
                      <p>D) {q.option_d}</p>
                    </div>
                    <p className="text-sm text-green-600">✓ Correct: {q.correct_answer}</p>
                    {q.explanation && (
                      <p className="text-sm text-gray-600 mt-1">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}
                {parsedQuestions.length > 5 && (
                  <p className="text-center text-gray-500">
                    ... and {parsedQuestions.length - 5} more questions
                  </p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={saveQuestions}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Saving...' : `Save ${parsedQuestions.length} Questions`}
                </button>
                <button
                  onClick={() => setStep('input')}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 'complete' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Success! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {parsedQuestions.length} questions imported successfully
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push(`/admin/tests/${testId}/questions/view`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View All Questions
                </button>
                <button
                  onClick={() => {
                    setStep('input')
                    setTextInput('')
                    setParsedQuestions([])
                  }}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}