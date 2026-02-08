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
B) Delhi*
C) Kolkata
D) Chennai

Q2. What is 2+2?
A) 2
B) 3
C) 4*
D) 5

Q3. Largest planet in solar system?
A) Jupiter*
B) Saturn
C) Earth
D) Mars`

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

      questionBlocks.forEach((block, blockIndex) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        
        if (lines.length < 4) return // Need at least question + 4 options

        const questionText = lines[0]
        
        // Find options with A), B), C), D)
        const options = lines.filter(l => /^[A-D]\)/.test(l))
        
        if (!questionText || options.length !== 4) {
          console.log(`Skipping question ${blockIndex + 1}: Invalid format`)
          return
        }

        // Extract options and find correct answer (marked with *)
        let correctAnswer = ''
        const optionA = options[0].replace(/^A\)\s*/, '').trim()
        const optionB = options[1].replace(/^B\)\s*/, '').trim()
        const optionC = options[2].replace(/^C\)\s*/, '').trim()
        const optionD = options[3].replace(/^D\)\s*/, '').trim()

        // Check which option has asterisk
        if (optionA.includes('*')) {
          correctAnswer = 'A'
        } else if (optionB.includes('*')) {
          correctAnswer = 'B'
        } else if (optionC.includes('*')) {
          correctAnswer = 'C'
        } else if (optionD.includes('*')) {
          correctAnswer = 'D'
        }

        if (!correctAnswer) {
          console.log(`Skipping question ${blockIndex + 1}: No correct answer marked with *`)
          return
        }

        // Remove asterisk from options
        const cleanOptionA = optionA.replace(/\*/g, '').trim()
        const cleanOptionB = optionB.replace(/\*/g, '').trim()
        const cleanOptionC = optionC.replace(/\*/g, '').trim()
        const cleanOptionD = optionD.replace(/\*/g, '').trim()

        questions.push({
          question_text: questionText,
          option_a: cleanOptionA,
          option_b: cleanOptionB,
          option_c: cleanOptionC,
          option_d: cleanOptionD,
          correct_answer: correctAnswer,
          explanation: '',
          marks: 4
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
                      <li>4 options: A), B), C), D)</li>
                      <li><strong>Correct answer marked with * (asterisk)</strong></li>
                      <li>Example: B) Delhi*</li>
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
                    <li>• Leave blank line between questions (optional)</li>
                    <li>• Options must start with A), B), C), D)</li>
                    <li>• Mark correct answer with * after option text</li>
                    <li>• Example: C) New Delhi*</li>
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
                      <p className={q.correct_answer === 'A' ? 'text-green-600 font-bold' : ''}>
                        A) {q.option_a}
                      </p>
                      <p className={q.correct_answer === 'B' ? 'text-green-600 font-bold' : ''}>
                        B) {q.option_b}
                      </p>
                      <p className={q.correct_answer === 'C' ? 'text-green-600 font-bold' : ''}>
                        C) {q.option_c}
                      </p>
                      <p className={q.correct_answer === 'D' ? 'text-green-600 font-bold' : ''}>
                        D) {q.option_d}
                      </p>
                    </div>
                    <p className="text-sm text-green-600">✓ Correct Answer: {q.correct_answer}</p>
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