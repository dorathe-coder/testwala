'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'

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

export default function PDFImportPage() {
  const [test, setTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [questionPdf, setQuestionPdf] = useState<File | null>(null)
  const [answerPdf, setAnswerPdf] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload')
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

    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    setTest(testData)
    setLoading(false)
  }

  async function handlePDFUpload() {
    if (!questionPdf) {
      toast.error('Please upload question PDF')
      return
    }

    setProcessing(true)
    toast.loading('Processing PDFs with AI... This may take 1-2 minutes')

    try {
      // Convert PDFs to base64
      const questionBase64 = await fileToBase64(questionPdf)
      const answerBase64 = answerPdf ? await fileToBase64(answerPdf) : null

      // Call AI API to extract questions
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPdf: questionBase64,
          answerPdf: answerBase64,
          testLanguage: test.language
        })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        setProcessing(false)
        return
      }

      setParsedQuestions(data.questions)
      setStep('review')
      toast.success(`${data.questions.length} questions extracted successfully!`)
    } catch (error) {
      toast.error('Error processing PDFs')
      console.error(error)
    }

    setProcessing(false)
  }

  async function handleSaveQuestions() {
    setProcessing(true)
    toast.loading('Saving questions to database...')

    const questionsToInsert = parsedQuestions.map((q, index) => ({
      test_id: testId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      marks: q.marks || 4,
      order_number: index + 1
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

    toast.success('All questions saved successfully!')
    setStep('complete')
    setProcessing(false)
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
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
              <Sparkles className="w-10 h-10 text-purple-600" />
              <span>AI-Powered PDF Import</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Upload PDFs and let AI automatically extract questions, options, and answers
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                  1
                </div>
                <span className="font-medium">Upload</span>
              </div>
              <div className="w-16 h-1 bg-gray-300 dark:bg-gray-700"></div>
              <div className={`flex items-center space-x-2 ${step === 'review' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-blue-600 text-white' : step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
                <span className="font-medium">Review</span>
              </div>
              <div className="w-16 h-1 bg-gray-300 dark:bg-gray-700"></div>
              <div className={`flex items-center space-x-2 ${step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  3
                </div>
                <span className="font-medium">Complete</span>
              </div>
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-6">
                {/* Question PDF Upload */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    📄 Question Paper PDF *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)}
                      className="hidden"
                      id="question-pdf"
                    />
                    <label htmlFor="question-pdf" className="cursor-pointer">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      {questionPdf ? (
                        <p className="text-green-600 font-medium">{questionPdf.name}</p>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">Click to upload question PDF</p>
                      )}
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Upload the PDF containing questions with options
                  </p>
                </div>

                {/* Answer PDF Upload (Optional) */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    📋 Answer Key PDF (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setAnswerPdf(e.target.files?.[0] || null)}
                      className="hidden"
                      id="answer-pdf"
                    />
                    <label htmlFor="answer-pdf" className="cursor-pointer">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      {answerPdf ? (
                        <p className="text-green-600 font-medium">{answerPdf.name}</p>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400">Click to upload answer key PDF</p>
                      )}
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Upload separate answer PDF or AI will try to detect answers from question paper
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                        AI will automatically:
                      </h4>
                      <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1">
                        <li>✓ Extract all questions from PDF</li>
                        <li>✓ Identify options (A, B, C, D)</li>
                        <li>✓ Match correct answers</li>
                        <li>✓ Parse explanations (if available)</li>
                        <li>✓ Handle {test.language} language</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePDFUpload}
                  disabled={!questionPdf || processing}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Process PDFs with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review (Placeholder for now) */}
          {step === 'review' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Review Extracted Questions ({parsedQuestions.length})
              </h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                {parsedQuestions.map((q, index) => (
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
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Correct: {q.correct_answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleSaveQuestions}
                  disabled={processing}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Saving...' : 'Save All Questions'}
                </button>
                <button
                  onClick={() => setStep('upload')}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300"
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
                Questions Imported Successfully! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {parsedQuestions.length} questions have been added to your test
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push(`/admin/tests/${testId}/questions`)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Back to Questions
                </button>
                <button
                  onClick={() => router.push('/admin/tests')}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300"
                >
                  Back to Tests
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}