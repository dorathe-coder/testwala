import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { question_text, option_a, option_b, option_c, option_d, correct_answer, selected_answer } = await req.json()

    const prompt = `Ek student ne yeh question galat kiya. Unhe simple Hindi/English mein samjhao.

Question: ${question_text}

Options:
A) ${option_a}
B) ${option_b}
C) ${option_c}
D) ${option_d}

Sahi Answer: ${correct_answer}
Student ka Answer: ${selected_answer || 'Attempt nahi kiya'}

Please explain karo:
1. Sahi answer kyun correct hai
2. Student ka answer kyun galat tha (agar attempt kiya)
3. Ek easy trick ya concept jo yaad rahe

Short aur clear rakho (200 words max).`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const explanation = message.content[0].type === 'text' ? message.content[0].text : 'Explanation nahi mili.'

    return NextResponse.json({ explanation })
  } catch (error: any) {
    console.error('AI explanation error:', error)
    return NextResponse.json({ explanation: 'AI se connect nahi ho saka. Please try again.' }, { status: 500 })
  }
}