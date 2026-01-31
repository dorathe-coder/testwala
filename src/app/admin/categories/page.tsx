'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string
  icon: string
  is_active: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚'
  })
  const [editingId, setEditingId] = useState<string | null>(null)
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

    await loadCategories()
    setLoading(false)
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('test_categories')
      .select('*')
      .order('name')

    setCategories(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editingId) {
      const { error } = await supabase
        .from('test_categories')
        .update(formData)
        .eq('id', editingId)

      if (error) {
        toast.error('Error updating category')
        return
      }
      toast.success('Category updated!')
    } else {
      const { error } = await supabase
        .from('test_categories')
        .insert([formData])

      if (error) {
        toast.error('Error creating category')
        return
      }
      toast.success('Category created!')
    }

    setFormData({ name: '', description: '', icon: '📚' })
    setEditingId(null)
    setShowForm(false)
    loadCategories()
  }

  async function handleEdit(category: Category) {
    setFormData({
      name: category.name,
      description: category.description,
      icon: category.icon
    })
    setEditingId(category.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This will affect all tests in this category.')) return

    const { error } = await supabase
      .from('test_categories')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Error deleting category')
      return
    }

    toast.success('Category deleted!')
    loadCategories()
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('test_categories')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      toast.error('Error updating status')
      return
    }

    toast.success('Status updated!')
    loadCategories()
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
              📁 Manage Categories
            </h1>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({ name: '', description: '', icon: '📚' })
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>New Category</span>
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingId ? 'Edit Category' : 'Create Category'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="e.g., JEE Main"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Category description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="📚"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {category.is_active ? '✅ Active' : '❌ Inactive'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {category.description}
                </p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => toggleActive(category.id, category.is_active)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    {category.is_active ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}