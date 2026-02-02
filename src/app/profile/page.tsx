'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { User, Mail, Calendar, Save, Award } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    totalTests: 0,
    avgScore: 0,
    rank: 0
  })
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }

    setUser(currentUser)
    setFullName(currentUser.user_metadata?.full_name || '')

    // Load user data from database
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    setUserData(dbUser)

    // Load stats
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('score')
      .eq('user_id', currentUser.id)
      .not('completed_at', 'is', null)

    const totalTests = attempts?.length || 0
    const avgScore = attempts && attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
      : 0

    // Calculate rank
    const { data: allUsers } = await supabase
      .from('test_attempts')
      .select('user_id, score')
      .not('completed_at', 'is', null)

    const userScores = new Map()
    allUsers?.forEach((attempt: any) => {
      const current = userScores.get(attempt.user_id) || 0
      userScores.set(attempt.user_id, current + (attempt.score || 0))
    })

    const sortedUsers = Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
    const userRank = sortedUsers.findIndex(([id]) => id === currentUser.id) + 1

    setStats({
      totalTests,
      avgScore,
      rank: userRank || 0
    })

    setLoading(false)
  }

  async function handleSave() {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setSaving(true)

    // Update in users table
    const { error: dbError } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', user.id)

    // Update in auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    if (dbError || authError) {
      toast.error('Error updating profile')
      console.error(dbError || authError)
      setSaving(false)
      return
    }

    toast.success('Profile updated!')
    setSaving(false)
    await loadProfile()
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
            👤 My Profile
          </h1>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Profile Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Personal Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Member Since
                    </label>
                    <input
                      type="text"
                      value={new Date(userData?.created_at || user?.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      value={userData?.role === 'admin' ? '🔧 Admin' : '👤 Student'}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Tests Completed</p>
                    <p className="text-3xl font-bold">{stats.totalTests}</p>
                  </div>

                  <div>
                    <p className="text-blue-100 text-sm mb-1">Average Score</p>
                    <p className="text-3xl font-bold">{stats.avgScore}</p>
                  </div>

                  {stats.rank > 0 && (
                    <div>
                      <p className="text-blue-100 text-sm mb-1">Overall Rank</p>
                      <p className="text-3xl font-bold flex items-center">
                        #{stats.rank}
                        <Award className="w-6 h-6 ml-2" />
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <a href="/dashboard" className="block px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                    → Dashboard
                  </a>
                  <a href="/history" className="block px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                    → Test History
                  </a>
                  <a href="/leaderboard" className="block px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                    → Leaderboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}