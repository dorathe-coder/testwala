import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, score, total_marks, time_taken, test_duration } = await req.json()

    // XP Calculate karo
    let xpEarned = 10 // base XP test complete karne pe
    const percentage = total_marks > 0 ? (score / total_marks) * 100 : 0
    if (percentage >= 80) xpEarned += 20 // bonus for 80%+

    // Har sahi answer pe 2 XP (approximate)
    const correctAnswers = Math.round((percentage / 100) * (total_marks / 4))
    xpEarned += correctAnswers * 2

    // Get current user data
    const { data: userData } = await supabase
      .from('users')
      .select('xp_points, streak_days, last_test_date')
      .eq('id', user_id)
      .single()

    // Streak calculate karo
    let newStreak = 1
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (userData?.last_test_date === yesterday) {
      newStreak = (userData.streak_days || 0) + 1
      xpEarned += 5 // streak bonus
    } else if (userData?.last_test_date === today) {
      newStreak = userData.streak_days || 1
    }

    const newXP = (userData?.xp_points || 0) + xpEarned

    // User update karo
    await supabase.from('users').update({
      xp_points: newXP,
      streak_days: newStreak,
      last_test_date: today
    }).eq('id', user_id)

    // Badges check karo
    const newBadges: string[] = []

    // Get total attempts
    const { count: totalAttempts } = await supabase
      .from('test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_completed', true)

    // Get total questions attempted
    const { count: totalQuestions } = await supabase
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', user_id)

    const badgesToCheck = [
      { name: '🥇 First Test', condition: totalAttempts === 1 },
      { name: '💯 Perfect Score', condition: percentage === 100 },
      { name: '🔥 7 Day Streak', condition: newStreak >= 7 },
      { name: '⚡ Speed Demon', condition: time_taken < (test_duration * 60 * 0.5) },
    ]

    for (const badge of badgesToCheck) {
      if (badge.condition) {
        const { error } = await supabase.from('user_badges').insert({
          user_id,
          badge_name: badge.name
        })
        if (!error) newBadges.push(badge.name)
      }
    }

    return NextResponse.json({ xpEarned, newXP, newStreak, newBadges })
  } catch (error: any) {
    console.error('XP award error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}