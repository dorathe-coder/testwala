'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { Clock, Award, BookOpen, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SharePage() {
  const [test, setTest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const shareCode = params.shareCode as string

  useEffect(() => { loadTest() }, [])

  async function loadTest() {
    const { data } = await supabase
      .from('tests')
      .select('*, test_categories(name, icon)')
      .eq('share_code', shareCode)
      .eq('is_active', true)
      .single()

    if (!data) { toast.error('Test nahi mila!'); router.push('/tests'); return }
    setTest(data)
    setLoading(false)
  }

  async function startTest() {
    setStarting(true)
    const user = await getUser()
    if (!user) {
      toast.error('Pehle login karo!')
      router.push(`/login?redirect=/t/${shareCode}`)
      return
    }

    const { data: attempt, error } = await supabase
      .from('test_attempts')
      .insert({ test_id: test.id, user_id: user.id, started_at: new Date().toISOString() })
      .select()
      .single()

    if (error) { toast.error('Error starting test'); setStarting(false); return }
    router.push(`/tests/${test.id}/take/${attempt.id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
              <div className="text-5xl mb-3">{test?.test_categories?.icon || '📝'}</div>
              <h1 className="text-3xl font-bold text-white mb-2">{test?.title}</h1>
              <p className="text-blue-100">{test?.test_categories?.name}</p>
            </div>

            {/* Details */}
            <div className="p-8">
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">{test?.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{test?.duration}</p>
                  <p className="text-xs text-gray-500">Minutes</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                  <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{test?.total_marks}</p>
                  <p className="text-xs text-gray-500">Total Marks</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
                  <BookOpen className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{test?.difficulty}</p>
                  <p className="text-xs text-gray-500">Difficulty</p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">📋 Instructions:</h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Ek baar start karne ke baad timer chalu ho jayega</li>
                  <li>• Har sahi jawab: +{test?.marks_per_question || 1} marks</li>
                  {test?.negative_marking && <li>• Galat jawab: -{test?.negative_marks} marks</li>}
                  <li>• Submit karne ke baad dobara nahi ho sakta</li>
                </ul>
              </div>

              <button onClick={startTest} disabled={starting}
                className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xl disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                {starting ? 'Starting...' : '🚀 Start Test'}
              </button>

              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }}
                className="w-full mt-3 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 font-medium flex items-center justify-center space-x-2">
                <Share2 className="w-5 h-5" />
                <span>Share Link Copy Karo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}