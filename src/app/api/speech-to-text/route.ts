import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get("chunk") as Blob
    const audioFile = new File([audioBlob], "audio.wav", { type: audioBlob.type, lastModified: Date.now() })

    if (!audioBlob) {
      console.error("No audio chunk provided")
      return NextResponse.json({ error: "No audio chunk provided" }, { status: 400 })
    }

    console.log("Received audio chunk:", {
      size: audioBlob.size,
      type: audioBlob.type,
    })

    if (audioBlob.size === 0) {
      console.error("Empty audio chunk received")
      return NextResponse.json({ error: "Empty audio chunk received" }, { status: 400 })
    }

    // Get raw transcription from Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    })

    console.log("Transcription received:", transcription.text)

    return NextResponse.json({
      text: transcription.text,
      success: true,
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    )
  }
}

