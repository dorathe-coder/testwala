'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Eye, EyeOff, FileQuestion } from 'lucide-react'

interface Test {
  id: string
  title: string
  description: string
  subject: string
  difficulty: string
  duration: number
  total_marks: number
  language: string
  is_active: boolean
  test_categories: {
    name: string
    icon: string
  }
}

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

    await loadTests()
    setLoading(false)
  }

  async function loadTests() {
    const { data } = await supabase
      .from('tests')
      .select(`
        *,
        test_categories (
          name,
          icon
        )
      `)
      .order('created_at', { ascending: false })

    setTests(data || [])
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('tests')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error('Error updating status')
      return
    }

    toast.success('Status updated!')
    loadTests()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This will delete all questions and attempts for this test.')) return

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting test')
      return
    }

    toast.success('Test deleted!')
    loadTests()
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
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              📚 Manage Tests
            </h1>
            <Link
              href="/admin/tests/create"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Test</span>
            </Link>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                No tests created yet
              </p>
              <Link
                href="/admin/tests/create"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                <span>Create Your First Test</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{test.test_categories?.icon || '📝'}</span>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {test.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {test.test_categories?.name} • {test.language === 'Gujarati' ? '🇮🇳 ગુજરાતી' : '🇬🇧 English'}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {test.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>📖 {test.subject}</span>
                        <span>⏱️ {test.duration} min</span>
                        <span>📊 {test.total_marks} marks</span>
                        <span className={`px-2 py-1 rounded ${
                          test.difficulty === 'Easy' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                          test.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' :
                          'bg-red-100 text-red-600 dark:bg-red-900/30'
                        }`}>
                          {test.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          test.is_active 
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                        }`}>
                          {test.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => toggleActive(test.id, test.is_active)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm whitespace-nowrap"
                      >
                        {test.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{test.is_active ? 'Hide' : 'Show'}</span>
                      </button>

                      <Link
                        href={`/admin/tests/${test.id}/questions`}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 text-sm whitespace-nowrap"
                      >
                        <FileQuestion className="w-4 h-4" />
                        <span>Questions</span>
                      </Link>

                      <button
                        onClick={() => handleDelete(test.id)}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}