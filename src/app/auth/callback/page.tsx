'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      const user = session.user

      // Check if user exists in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      // If user doesn't exist, create profile
      if (!existingUser) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'user'
        })

        console.log('New Google user created:', user.email)
      }

      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  )
}