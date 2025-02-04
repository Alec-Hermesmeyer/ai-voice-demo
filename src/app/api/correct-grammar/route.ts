import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that corrects grammar and capitalization. Keep the same meaning but fix any errors. Be concise and only return the corrected text."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 256,
    })

    return NextResponse.json({
      corrected: response.choices[0].message.content
    })
  } catch (error) {
    console.error("Grammar correction error:", error)
    return NextResponse.json(
      { error: "Failed to correct grammar" },
      { status: 500 }
    )
  }
}
