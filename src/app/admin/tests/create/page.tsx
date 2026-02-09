'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  icon: string
}

export default function CreateTestPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    subject: '',
    language: 'English',
    difficulty: 'Medium',
    duration: 60,
    total_marks: 100,
    marks_per_question: 1,
    passing_marks: 40,
    negative_marking: false,
    negative_marks: 0.25
  })
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

    const { data: categoriesData } = await supabase
      .from('test_categories')
      .select('id, name, icon')
      .eq('is_active', true)
      .order('name')

    setCategories(categoriesData || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const { data, error } = await supabase
      .from('tests')
      .insert([{
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        subject: formData.subject,
        language: formData.language,
        difficulty: formData.difficulty,
        duration: formData.duration,
        total_marks: formData.total_marks,
        marks_per_question: formData.marks_per_question,
        passing_marks: formData.passing_marks,
        negative_marking: formData.negative_marking,
        negative_marks: formData.negative_marking ? formData.negative_marks : 0,
        is_active: true
      }])
      .select()

    if (error) {
      toast.error('Error creating test')
      setSubmitting(false)
      return
    }

    toast.success('Test created successfully!')
    router.push('/admin/tests')
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            ✏️ Create New Test
          </h1>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">
            
            {/* Test Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="e.g., Physics Mock Test 1"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Brief description of the test"
              />
            </div>

            {/* Category & Subject */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject *
                </label>
                <select
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Select Subject</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="Mixed">Mixed (All Subjects)</option>
                </select>
              </div>
            </div>

            {/* Language & Difficulty */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language *
                </label>
                <select
                  required
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="English">🇬🇧 English</option>
                  <option value="Gujarati">🇮🇳 ગુજરાતી (Gujarati)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty *
                </label>
                <select
                  required
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Duration & Total Marks */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Marks *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.total_marks}
                  onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* NEW: Marks Per Question & Passing Marks */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marks Per Question *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  value={formData.marks_per_question}
                  onChange={(e) => setFormData({ ...formData, marks_per_question: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="e.g., 1, 2, 4"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Same marks will apply to all questions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Passing Marks *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={formData.total_marks}
                  value={formData.passing_marks}
                  onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="e.g., 40"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum marks required to pass
                </p>
              </div>
            </div>

            {/* Negative Marking */}
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="negative_marking"
                  checked={formData.negative_marking}
                  onChange={(e) => setFormData({ ...formData, negative_marking: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="negative_marking" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Negative Marking
                </label>
              </div>

              {/* NEW: Negative Marks Input */}
              {formData.negative_marking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Negative Marks (per wrong answer) *
                  </label>
                  <select
                    required={formData.negative_marking}
                    value={formData.negative_marks}
                    onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="0.25">-0.25 marks</option>
                    <option value="0.33">-0.33 marks (1/3)</option>
                    <option value="0.5">-0.5 marks</option>
                    <option value="1">-1 mark</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Marks deducted for each incorrect answer
                  </p>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Test'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/tests')}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}