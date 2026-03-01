import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id, score, total_marks, time_taken, test_duration } = await req.json()

    let xpEarned = 10
    const percentage = total_marks > 0 ? (score / total_marks) * 100 : 0
    if (percentage >= 80) xpEarned += 20

    const correctAnswers = Math.round((percentage / 100) * (total_marks / 4))
    xpEarned += correctAnswers * 2

    const { data: userData } = await supabase
      .from('users')
      .select('xp_points, streak_days, last_test_date')
      .eq('id', user_id)
      .single()

    let newStreak = 1
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (userData?.last_test_date === yesterday) {
      newStreak = (userData.streak_days || 0) + 1
      xpEarned += 5
    } else if (userData?.last_test_date === today) {
      newStreak = userData.streak_days || 1
    }

    const newXP = (userData?.xp_points || 0) + xpEarned

    await supabase.from('users').update({
      xp_points: newXP,
      streak_days: newStreak,
      last_test_date: today
    }).eq('id', user_id)

    const newBadges: string[] = []

    const { count: totalAttempts } = await supabase
      .from('test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_completed', true)

    const badgesToCheck = [
      { name: '🥇 First Test', condition: totalAttempts === 1 },
      { name: '💯 Perfect Score', condition: percentage === 100 },
      { name: '🔥 7 Day Streak', condition: newStreak >= 7 },
      { name: '⚡ Speed Demon', condition: time_taken < (test_duration * 60 * 0.5) },
    ]

    for (const badge of badgesToCheck) {
      if (badge.condition) {
        const { error } = await supabase.from('user_badges').insert({ user_id, badge_name: badge.name })
        if (!error) newBadges.push(badge.name)
      }
    }

    return NextResponse.json({ xpEarned, newXP, newStreak, newBadges })
  } catch (error: any) {
    console.error('XP award error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}