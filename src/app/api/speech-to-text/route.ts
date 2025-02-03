import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const fileBlob = formData.get("file") as Blob
    const file = new File([fileBlob], "audio.wav", { type: fileBlob.type, lastModified: Date.now() })
    const speakerData = formData.get("speakerData") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    })

    // If speaker data was provided, include it in the response
    const speakerInfo = speakerData ? JSON.parse(speakerData) : null

    return NextResponse.json({
      text: transcription.text,
      speaker: speakerInfo,
    })
  } catch (error) {
    console.error("Error in speech-to-text:", error)
    return NextResponse.json({ error: "Failed to convert speech to text" }, { status: 500 })
  }
}

