'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Upload, FileJson, CheckCircle, Trash2, AlertCircle } from 'lucide-react'

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

export default function JSONImportPage() {
  const [test, setTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload')
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const user = await getUser()
    if (!user) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin') { router.push('/dashboard'); return }
    const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single()
    setTest(testData)
    setLoading(false)
  }

  function parseCSV(text: string): ParsedQuestion[] {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') inQuotes = !inQuotes
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
        else current += char
      }
      values.push(current.trim())
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/"/g, '') })
      return {
        question_text: obj['question_text'] || obj['question'] || '',
        option_a: obj['option_a'] || obj['a'] || '',
        option_b: obj['option_b'] || obj['b'] || '',
        option_c: obj['option_c'] || obj['c'] || '',
        option_d: obj['option_d'] || obj['d'] || '',
        correct_answer: (obj['correct_answer'] || obj['answer'] || 'A').toUpperCase().trim(),
        explanation: obj['explanation'] || '',
        marks: parseInt(obj['marks'] || '4') || 4
      }
    })
  }

  async function handleFileUpload() {
    if (!file) { toast.error('Please select a file'); return }
    setProcessing(true)
    setErrors([])
    try {
      const text = await file.text()
      let questions: ParsedQuestion[] = []
      const newErrors: string[] = []
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text)
        questions = Array.isArray(parsed) ? parsed : [parsed]
      } else if (file.name.endsWith('.csv')) {
        questions = parseCSV(text)
      } else {
        toast.error('Sirf .json ya .csv file upload karo')
        setProcessing(false)
        return
      }
      questions.forEach((q, i) => {
        if (!q.question_text) newErrors.push(`Row ${i + 1}: question_text missing`)
        if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) newErrors.push(`Row ${i + 1}: option missing`)
        if (!['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase())) newErrors.push(`Row ${i + 1}: correct_answer A/B/C/D hona chahiye`)
      })
      setErrors(newErrors)
      setParsedQuestions(questions)
      setStep('review')
      toast.success(`${questions.length} questions parse ho gaye!`)
    } catch (err: any) {
      toast.error('File parse error: ' + err.message)
    }
    setProcessing(false)
  }

  async function handleSaveQuestions() {
    const valid = parsedQuestions.filter(q =>
      q.question_text && q.option_a && q.option_b && q.option_c && q.option_d &&
      ['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase())
    )
    if (valid.length === 0) { toast.error('Koi valid question nahi'); return }
    setProcessing(true)
    const toInsert = valid.map((q, i) => ({
      test_id: testId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer.toUpperCase(),
      explanation: q.explanation || '',
      marks: q.marks || 4,
      order_number: i + 1
    }))
    const { error } = await supabase.from('questions').insert(toInsert)
    if (error) { toast.error('Save error: ' + error.message); setProcessing(false); return }
    toast.success(`${valid.length} questions save ho gaye!`)
    setStep('complete')
    setProcessing(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  const stepIndex = ['upload', 'review', 'complete'].indexOf(step)

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button onClick={() => router.push(`/admin/tests/${testId}/questions`)} className="text-sm text-blue-600 hover:underline mb-4 block">← Back</button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <FileJson className="w-10 h-10 text-green-600" />
              <span>JSON / CSV Import</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">ChatGPT/Claude se JSON banao, yahan upload karo — no AI API needed!</p>
          </div>

          <div className="flex items-center justify-center mb-8">
            {['Upload', 'Review', 'Complete'].map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={`flex items-center space-x-2 ${stepIndex === i ? 'text-blue-600' : stepIndex > i ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${stepIndex === i ? 'bg-blue-600' : stepIndex > i ? 'bg-green-600' : 'bg-gray-300'}`}>{i + 1}</div>
                  <span className="font-medium hidden sm:block">{label}</span>
                </div>
                {i < 2 && <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 mx-2"></div>}
              </div>
            ))}
          </div>

          {step === 'upload' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">💡 Pehle ChatGPT/Claude ko yeh prompt do + PDF attach karo:</h3>
                <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm font-mono text-gray-800 dark:text-gray-200 border border-blue-200 select-all whitespace-pre-wrap">{`Mujhe is PDF ke saare questions ek JSON file mein chahiye:\n[\n  {\n    "question_text": "Question yahan",\n    "option_a": "Option A",\n    "option_b": "Option B",\n    "option_c": "Option C",\n    "option_d": "Option D",\n    "correct_answer": "A",\n    "explanation": "Explanation",\n    "marks": 4\n  }\n]\nSirf JSON do, koi text nahi, koi backtick nahi.`}</div>
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">JSON ya CSV file upload karo</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center hover:border-green-500 transition-colors cursor-pointer" onClick={() => document.getElementById('json-file')?.click()}>
                  <input type="file" accept=".json,.csv" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" id="json-file" />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  {file ? <p className="text-green-600 font-semibold text-lg">{file.name}</p> : <p className="text-gray-500">Click karo ya drag & drop (.json ya .csv)</p>}
                </div>
              </div>
              <button onClick={handleFileUpload} disabled={!file || processing} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 text-lg">
                {processing ? 'Parsing...' : 'File Parse Karo →'}
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review ({parsedQuestions.length} questions)</h2>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium">
                  {parsedQuestions.filter(q => q.question_text && ['A','B','C','D'].includes(q.correct_answer?.toUpperCase())).length} valid
                </span>
              </div>
              {errors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-1"><AlertCircle className="w-5 h-5 text-yellow-600" /><span className="font-semibold text-yellow-800 dark:text-yellow-200">{errors.length} warnings</span></div>
                  {errors.slice(0, 3).map((e, i) => <p key={i} className="text-sm text-yellow-700">• {e}</p>)}
                </div>
              )}
              <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                {parsedQuestions.map((q, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Q{index + 1}. {q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-1">
                        <span>A) {q.option_a}</span><span>B) {q.option_b}</span>
                        <span>C) {q.option_c}</span><span>D) {q.option_d}</span>
                      </div>
                      <p className="text-xs text-green-600">✓ {q.correct_answer} | {q.marks} marks</p>
                    </div>
                    <button onClick={() => setParsedQuestions(prev => prev.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-3">
                <button onClick={handleSaveQuestions} disabled={processing} className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 text-lg">
                  {processing ? 'Saving...' : '💾 Save All Questions'}
                </button>
                <button onClick={() => setStep('upload')} className="px-5 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg">Back</button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg text-center">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Questions Import Ho Gaye! 🎉</h2>
              <div className="flex justify-center space-x-4 mt-6">
                <button onClick={() => router.push(`/admin/tests/${testId}/questions/view`)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">📋 Questions Dekho</button>
                <button onClick={() => router.push('/admin/tests')} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium">Tests List</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}