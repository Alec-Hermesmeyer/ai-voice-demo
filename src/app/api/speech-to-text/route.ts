import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const blob = formData.get("file") as Blob

    if (!blob) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // ✅ Convert Blob to File (Fixes the Type Error)
    const file = new File([blob], "audio.webm", { type: blob.type })

    // Send the converted file to OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file, // 🔥 Fix: Now a valid File type
      model: "whisper-1",
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error("Error in speech-to-text:", error)
    return NextResponse.json({ error: "Failed to convert speech to text" }, { status: 500 })
  }
}
