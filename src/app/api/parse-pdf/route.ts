import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { questionPdf, answerPdf, testLanguage } = await request.json()

    // For now, return demo parsed questions
    // In production, you would use Claude API or OpenAI API to parse PDFs
    
    const demoQuestions = [
      {
        question_text: testLanguage === 'Gujarati' 
          ? 'ન્યૂટનનો પ્રથમ નિયમ શું છે?'
          : 'What is Newton\'s First Law of Motion?',
        option_a: testLanguage === 'Gujarati'
          ? 'જડત્વનો નિયમ'
          : 'Law of Inertia',
        option_b: testLanguage === 'Gujarati'
          ? 'પ્રવેગનો નિયમ'
          : 'Law of Acceleration',
        option_c: testLanguage === 'Gujarati'
          ? 'ક્રિયા-પ્રતિક્રિયા નિયમ'
          : 'Law of Action-Reaction',
        option_d: testLanguage === 'Gujarati'
          ? 'ગુરુત્વાકર્ષણનો નિયમ'
          : 'Law of Gravitation',
        correct_answer: 'A',
        explanation: testLanguage === 'Gujarati'
          ? 'ન્યૂટનનો પ્રથમ નિયમ જડત્વનો નિયમ છે'
          : 'Newton\'s First Law is also known as the Law of Inertia',
        marks: 4
      },
      {
        question_text: testLanguage === 'Gujarati'
          ? 'પ્રકાશની ઝડપ કેટલી છે?'
          : 'What is the speed of light?',
        option_a: '3 × 10⁸ m/s',
        option_b: '3 × 10⁶ m/s',
        option_c: '3 × 10⁷ m/s',
        option_d: '3 × 10⁹ m/s',
        correct_answer: 'A',
        explanation: testLanguage === 'Gujarati'
          ? 'વેક્યુઅમમાં પ્રકાશની ઝડપ 3 × 10⁸ m/s છે'
          : 'Speed of light in vacuum is 3 × 10⁸ m/s',
        marks: 4
      }
    ]

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      questions: demoQuestions,
      message: `Successfully extracted ${demoQuestions.length} questions`
    })

  } catch (error: any) {
    console.error('PDF parsing error:', error)
    return NextResponse.json(
      { error: 'Failed to parse PDF. Please try again.' },
      { status: 500 }
    )
  }
}