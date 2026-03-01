'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Clock, BookOpen, Award, Languages } from 'lucide-react'
import { motion } from 'framer-motion'

interface Category {
  id: string
  name: string
  description: string
  icon: string
}

interface Test {
  id: string
  title: string
  description: string
  subject: string
  difficulty: string
  duration: number
  total_marks: number
  language: string
  test_categories: { name: string; icon: string }
}

export default function TestsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])
  useEffect(() => { filterTests() }, [selectedCategory, selectedLanguage])

  async function loadData() {
    const { data: categoriesData } = await supabase.from('test_categories').select('*').eq('is_active', true).order('name')
    const { data: testsData } = await supabase.from('tests').select('*, test_categories(name, icon)').eq('is_active', true).order('created_at', { ascending: false })
    setCategories(categoriesData || [])
    setTests(testsData || [])
    setLoading(false)
  }

  async function filterTests() {
    let query = supabase.from('tests').select('*, test_categories(name, icon)').eq('is_active', true)
    if (selectedCategory !== 'all') query = query.eq('category_id', selectedCategory)
    if (selectedLanguage !== 'all') query = query.eq('language', selectedLanguage)
    const { data } = await query.order('created_at', { ascending: false })
    setTests(data || [])
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'Hard': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-4xl px-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            📚 Browse Tests
          </motion.h1>

          {/* Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-blue-500'}`}>
                  All Categories
                </button>
                {categories.map((category) => (
                  <button key={category.id} onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${selectedCategory === category.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-blue-500'}`}>
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Language</label>
              <div className="flex gap-2">
                {[['all', 'All Languages'], ['English', '🇬🇧 English'], ['Gujarati', '🇮🇳 ગુજરાતી']].map(([val, label]) => (
                  <button key={val} onClick={() => setSelectedLanguage(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 ${selectedLanguage === val ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:border-blue-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tests Grid */}
          {tests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No tests found for selected filters</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test, i) => (
                <motion.div key={test.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{test.test_categories?.icon || '📝'}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{test.test_categories?.name}</p>
                    </div>
                    <motion.span
                      animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(test.difficulty)}`}>
                      {test.difficulty}
                    </motion.span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{test.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">{test.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400"><Clock className="w-4 h-4 mr-2" />{test.duration} minutes</div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400"><Award className="w-4 h-4 mr-2" />{test.total_marks} marks</div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400"><BookOpen className="w-4 h-4 mr-2" />{test.subject}</div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400"><Languages className="w-4 h-4 mr-2" />{test.language === 'Gujarati' ? '🇮🇳 ગુજરાતી' : '🇬🇧 English'}</div>
                  </div>
                  <Link href={`/tests/${test.id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all hover:scale-105 active:scale-95">
                    Start Test
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}