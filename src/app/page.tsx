'use client'

import Link from 'next/link'
import { BookOpen, Award, TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const words = ['JEE', 'NEET', 'UPSC', 'Exams']

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const word = words[wordIndex]
    if (typing) {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 100)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setTyping(false), 1200)
        return () => clearTimeout(t)
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 60)
        return () => clearTimeout(t)
      } else {
        setWordIndex((i) => (i + 1) % words.length)
        setTyping(true)
      }
    }
  }, [displayed, typing, wordIndex])

  const features = [
    { icon: <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />, title: 'Multiple Subjects', desc: 'Physics, Chemistry, Math, Biology - all subjects covered' },
    { icon: <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />, title: 'Real Exam Pattern', desc: 'Practice with actual JEE/NEET exam patterns' },
    { icon: <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />, title: 'Track Progress', desc: 'Detailed analytics to monitor your improvement' },
    { icon: <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />, title: 'Compete & Learn', desc: 'Join leaderboards and learn from solutions' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">

      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              🎯 TestWala
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-x-4">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600">Login</Link>
              <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sign Up</Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Floating background circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full opacity-10 bg-blue-500"
            style={{ width: 80 + i * 60, height: 80 + i * 60, left: `${10 + i * 15}%`, top: `${10 + i * 12}%` }}
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Master Your{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {displayed}<span className="animate-pulse">|</span>
            </span>
            <br />with TestWala
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Practice with mock tests for JEE, NEET, and more. Track your progress, compete with peers, and ace your exams!
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-300 hover:scale-105 active:scale-95">
              Get Started Free 🚀
            </Link>
            <Link href="/tests" className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-700 rounded-lg font-semibold text-lg hover:border-blue-600 transition-all hover:scale-105 active:scale-95">
              Browse Tests
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Why Choose TestWala?
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center cursor-default">
              {f.icon}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to ace your exams?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of students preparing with TestWala</p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-lg">
            Start Practicing Now
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2026 TestWala. Made with ❤️ for students.</p>
        </div>
      </footer>
    </div>
  )
}