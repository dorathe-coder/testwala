'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, Plus, Copy, BookOpen, Wand2 } from 'lucide-react'

interface Test {
  id: string
  title: string
  language: string
}

export default function QuestionsPage() {
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMethodSelector, setShowMethodSelector] = useState(false)
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
      .select('id, title, language')
      .eq('id', testId)
      .single()

    if (!testData) {
      toast.error('Test not found')
      router.push('/admin/tests')
      return
    }

    setTest(testData)
    setLoading(false)
  }

  const importMethods = [
    {
      id: 'pdf',
      title: '📄 PDF Upload (AI Import)',
      description: 'Upload question & answer PDFs - AI will auto-extract',
      badge: 'RECOMMENDED',
      icon: <Wand2 className="w-8 h-8 text-purple-600" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      route: `/admin/tests/${testId}/questions/pdf-import`
    },
    {
      id: 'excel',
      title: '📊 Excel/CSV Import',
      description: 'Download template, fill questions, upload',
      badge: 'EASY',
      icon: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      route: `/admin/tests/${testId}/questions/excel-import`
    },
    {
      id: 'manual',
      title: '✏️ Manual Entry',
      description: 'Add questions one by one using form',
      badge: null,
      icon: <Plus className="w-8 h-8 text-blue-600" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      route: `/admin/tests/${testId}/questions/manual-add`
    },
    {
      id: 'bulk-paste',
      title: '📋 Bulk Paste',
      description: 'Copy-paste multiple questions in text format',
      badge: 'QUICK',
      icon: <Copy className="w-8 h-8 text-orange-600" />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      route: `/admin/tests/${testId}/questions/bulk-paste`
    },
    {
      id: 'clone',
      title: '📑 Clone from Test',
      description: 'Copy questions from another test',
      badge: null,
      icon: <BookOpen className="w-8 h-8 text-teal-600" />,
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      route: `/admin/tests/${testId}/questions/clone`
    },
    {
      id: 'bank',
      title: '🏦 Question Bank',
      description: 'Select from pre-made question library',
      badge: 'COMING SOON',
      icon: <Upload className="w-8 h-8 text-gray-400" />,
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      route: null
    }
  ]

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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <button onClick={() => router.push('/admin/tests')} className="hover:text-blue-600">
                Tests
              </button>
              <span>/</span>
              <span>{test?.title}</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              📝 Manage Questions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Test: {test?.title} • Language: {test?.language}
            </p>
          </div>
          {/* View All Questions Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(`/admin/tests/${testId}/questions/view`)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg"
            >
              <span>📋 View All Questions</span>
            </button>
          </div>

          {/* Import Methods Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {importMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => method.route && router.push(method.route)}
                disabled={!method.route}
                className={`${method.bgColor} p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all text-left relative ${
                  !method.route ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'
                }`}
              >
                {method.badge && (
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      method.badge === 'RECOMMENDED' ? 'bg-purple-600 text-white' :
                      method.badge === 'EASY' ? 'bg-green-600 text-white' :
                      method.badge === 'QUICK' ? 'bg-orange-600 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {method.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  {method.icon}
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {method.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {method.description}
                </p>

                {method.route && (
                  <div className="mt-4">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Click to start →
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📊 Current Status
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
                <p className="text-3xl font-bold text-blue-600">0</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questions Needed</p>
                <p className="text-3xl font-bold text-orange-600">~30-50</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completion</p>
                <p className="text-3xl font-bold text-green-600">0%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}