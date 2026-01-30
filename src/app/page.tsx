'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTests() {
      const { data, error } = await supabase.from('tests').select('*')
      if (error) {
        console.error('Error:', error)
      } else {
        setTests(data || [])
      }
      setLoading(false)
    }
    fetchTests()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">🎯 TestWala - Database Connected!</h1>
      
      {loading ? (
        <p>Loading tests...</p>
      ) : (
        <div>
          <h2 className="text-2xl mb-4">Tests from Supabase:</h2>
          <pre className="bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(tests, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}