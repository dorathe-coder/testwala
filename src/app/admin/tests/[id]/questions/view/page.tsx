'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Edit2, Trash2, Eye, ArrowUp, ArrowDown, Plus } from 'lucide-react'

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  marks: number
  order_number: number
}

export default function ViewQuestionsPage() {
  const [test, setTest] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
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

    await loadTestAndQuestions()
    setLoading(false)
  }

  async function loadTestAndQuestions() {
    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('order_number')

    setTest(testData)
    setQuestions(questionsData || [])
  }

  async function handleDelete(questionId: string) {
    if (!confirm('Are you sure you want to delete this question?')) return

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)

    if (error) {
      toast.error('Error deleting question')
      return
    }

    toast.success('Question deleted!')
    loadTestAndQuestions()
  }

  async function handleUpdate() {
    if (!editingQuestion) return

    const { error } = await supabase
      .from('questions')
      .update({
        question_text: editingQuestion.question_text,
        option_a: editingQuestion.option_a,
        option_b: editingQuestion.option_b,
        option_c: editingQuestion.option_c,
        option_d: editingQuestion.option_d,
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation,
        marks: editingQuestion.marks
      })
      .eq('id', editingQuestion.id)

    if (error) {
      toast.error('Error updating question')
      return
    }

    toast.success('Question updated!')
    setShowEditModal(false)
    setEditingQuestion(null)
    loadTestAndQuestions()
  }

  async function moveQuestion(questionId: string, direction: 'up' | 'down') {
    const currentIndex = questions.findIndex(q => q.id === questionId)
    if (currentIndex === -1) return
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === questions.length - 1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const newQuestions = [...questions]
    const temp = newQuestions[currentIndex]
    newQuestions[currentIndex] = newQuestions[newIndex]
    newQuestions[newIndex] = temp

    // Update order numbers
    const updates = newQuestions.map((q, index) => ({
      id: q.id,
      order_number: index + 1
    }))

    for (const update of updates) {
      await supabase
        .from('questions')
        .update({ order_number: update.order_number })
        .eq('id', update.id)
    }

    toast.success('Order updated!')
    loadTestAndQuestions()
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  📝 All Questions
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Test: {test?.title} • {questions.length} Questions
                </p>
              </div>
              <button
                onClick={() => router.push(`/admin/tests/${testId}/questions`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                <span>Add More Questions</span>
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                No questions added yet
              </p>
              <button
                onClick={() => router.push(`/admin/tests/${testId}/questions`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3 mb-4">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                          Q{index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-lg font-medium text-gray-900 dark:text-white">
                            {question.question_text}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mb-4 ml-8">
                        <div className={`p-3 rounded-lg ${question.correct_answer === 'A' ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <span className="font-semibold">A)</span> {question.option_a}
                        </div>
                        <div className={`p-3 rounded-lg ${question.correct_answer === 'B' ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <span className="font-semibold">B)</span> {question.option_b}
                        </div>
                        <div className={`p-3 rounded-lg ${question.correct_answer === 'C' ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <span className="font-semibold">C)</span> {question.option_c}
                        </div>
                        <div className={`p-3 rounded-lg ${question.correct_answer === 'D' ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <span className="font-semibold">D)</span> {question.option_d}
                        </div>
                      </div>

                      {question.explanation && (
                        <div className="ml-8 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-900 dark:text-blue-200">
                            <span className="font-semibold">Explanation:</span> {question.explanation}
                          </p>
                        </div>
                      )}

                      <div className="ml-8 mt-3 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>✓ Correct Answer: <strong>{question.correct_answer}</strong></span>
                        <span>• Marks: <strong>{question.marks}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingQuestion(question)
                          setShowEditModal(true)
                        }}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(question.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>

                      <div className="flex space-x-1">
                        <button
                          onClick={() => moveQuestion(question.id, 'up')}
                          disabled={index === 0}
                          className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveQuestion(question.id, 'down')}
                          disabled={index === questions.length - 1}
                          className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Question
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Text
                </label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Option A
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_a}
                    onChange={(e) => setEditingQuestion({...editingQuestion, option_a: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Option B
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_b}
                    onChange={(e) => setEditingQuestion({...editingQuestion, option_b: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Option C
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_c}
                    onChange={(e) => setEditingQuestion({...editingQuestion, option_c: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Option D
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.option_d}
                    onChange={(e) => setEditingQuestion({...editingQuestion, option_d: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Correct Answer
                  </label>
                  <select
                    value={editingQuestion.correct_answer}
                    onChange={(e) => setEditingQuestion({...editingQuestion, correct_answer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Marks
                  </label>
                  <input
                    type="number"
                    value={editingQuestion.marks}
                    onChange={(e) => setEditingQuestion({...editingQuestion, marks: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Explanation (Optional)
                </label>
                <textarea
                  value={editingQuestion.explanation}
                  onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Question
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingQuestion(null)
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}