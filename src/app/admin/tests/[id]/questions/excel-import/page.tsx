'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Download, Upload, FileSpreadsheet, CheckCircle } from 'lucide-react'

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

export default function ExcelImportPage() {
  const [test, setTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload')
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

  function downloadTemplate() {
    const csvContent = `Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation,Marks
"What is 2+2?","2","3","4","5","C","Basic addition",4
"What is the capital of India?","Mumbai","Delhi","Kolkata","Chennai","B","Delhi is the capital",4
"Which is the largest planet?","Earth","Mars","Jupiter","Saturn","C","Jupiter is the largest planet in our solar system",4`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questions_template_${test?.language || 'english'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Template downloaded! Fill it and upload back.')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.csv') && !uploadedFile.name.endsWith('.xlsx')) {
      toast.error('Please upload CSV or Excel file')
      return
    }

    setFile(uploadedFile)
  }

  async function processFile() {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setProcessing(true)
    toast.loading('Processing file...')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Skip header
      const dataLines = lines.slice(1)
      
      const questions: ParsedQuestion[] = dataLines.map(line => {
        // Simple CSV parsing (handles quoted fields)
        const regex = /(".*?"|[^,]+)(?=\s*,|\s*$)/g
        const fields = []
        let match
        while ((match = regex.exec(line)) !== null) {
          fields.push(match[0].replace(/^"|"$/g, '').trim())
        }

        return {
          question_text: fields[0] || '',
          option_a: fields[1] || '',
          option_b: fields[2] || '',
          option_c: fields[3] || '',
          option_d: fields[4] || '',
          correct_answer: fields[5] || 'A',
          explanation: fields[6] || '',
          marks: parseInt(fields[7]) || 4
        }
      }).filter(q => q.question_text) // Remove empty questions

      if (questions.length === 0) {
        toast.error('No valid questions found in file')
        setProcessing(false)
        return
      }

      setParsedQuestions(questions)
      setStep('preview')
      toast.success(`${questions.length} questions parsed successfully!`)
    } catch (error) {
      toast.error('Error parsing file. Please check format.')
      console.error(error)
    }

    setProcessing(false)
  }

  async function saveQuestions() {
    setProcessing(true)
    toast.loading('Saving questions...')

    // Get current question count
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
      correct_answer: q.correct_answer.toUpperCase(),
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

    toast.success('All questions saved successfully!')
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button 
              onClick={() => router.push(`/admin/tests/${testId}/questions`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              ← Back to Import Methods
            </button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <FileSpreadsheet className="w-10 h-10 text-green-600" />
              <span>Excel/CSV Import</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Download template → Fill questions → Upload
            </p>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-green-600' : 'text-green-600'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white">
                  1
                </div>
                <span className="font-medium">Upload</span>
              </div>
              <div className="w-16 h-1 bg-gray-300 dark:bg-gray-700"></div>
              <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-green-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' || step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
                <span className="font-medium">Preview</span>
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
            <div className="space-y-6">
              {/* Download Template */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Step 1: Download Template
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Download our Excel/CSV template with sample questions. Fill it with your questions and upload back.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Template (CSV)</span>
                </button>
              </div>

              {/* Upload File */}
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Step 2: Upload Filled File
                </h2>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-file"
                  />
                  <label htmlFor="excel-file" className="cursor-pointer">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    {file ? (
                      <p className="text-green-600 font-medium text-lg">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          Click to upload CSV or Excel file
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Supports: .csv, .xlsx
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {file && (
                  <button
                    onClick={processFile}
                    disabled={processing}
                    className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Process File'}
                  </button>
                )}
              </div>

              {/* Format Guide */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                  📋 CSV Format Guide:
                </h3>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <p><strong>Columns (in order):</strong></p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Question</li>
                    <li>Option A</li>
                    <li>Option B</li>
                    <li>Option C</li>
                    <li>Option D</li>
                    <li>Correct Answer (A/B/C/D)</li>
                    <li>Explanation (optional)</li>
                    <li>Marks (number)</li>
                  </ol>
                  <p className="mt-3"><strong>Example:</strong></p>
                  <p className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                    "What is 2+2?","2","3","4","5","C","Basic math",4
                  </p>
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
                  onClick={() => setStep('upload')}
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
                    setStep('upload')
                    setFile(null)
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