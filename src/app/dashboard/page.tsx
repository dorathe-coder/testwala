'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Welcome, {user?.user_metadata?.full_name || user?.email}! 🎉
          </h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tests Taken
              </h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Average Score
              </h3>
              <p className="text-3xl font-bold text-green-600">0%</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Total Points
              </h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
            </div>
          </div>

          <div className="mt-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🎯 You're all set!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Authentication is working perfectly. Here's what we've built:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>✅ Email/Password Authentication</li>
              <li>✅ User Dashboard</li>
              <li>✅ Protected Routes</li>
              <li>✅ Dark/Light Theme Toggle</li>
              <li>✅ Responsive Navbar</li>
              <li>✅ Toast Notifications</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}