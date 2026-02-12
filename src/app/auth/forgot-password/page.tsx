'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '@/lib/auth'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      toast.error(error)
      setLoading(false)
      return
    }

    toast.success('Password reset email sent! Check your inbox.')
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <Send className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Check Your Email</h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Click the link in the email to reset your password. The link expires in 1 hour.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">🎯 TestWala</h2>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="inline w-4 h-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
            <Send className="w-4 h-4" />
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}