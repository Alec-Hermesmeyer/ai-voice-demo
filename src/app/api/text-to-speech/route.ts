import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const formData = await req.formData()
  const fileBlob = formData.get("file") as Blob
  const file = new File([fileBlob], "audio.wav", { type: fileBlob.type, lastModified: Date.now() })
  const isStream = formData.get("stream") === "true"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    if (isStream) {
      // Set up streaming response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word"],
          })

          // Send word-level timestamps
          if ("words" in transcription) {
            for (const word of transcription.words || []) {
              const chunk = {
                text: word.word,
                start: word.start,
                end: word.end,
              }
              controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"))
              // Simulate real-time delay based on word timing
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          }
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      // Regular non-streaming response
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
      })

      return NextResponse.json({
        text: transcription.text,
      })
    }
  } catch (error) {
    console.error("Error in speech-to-text:", error)
    return NextResponse.json({ error: "Failed to convert speech to text" }, { status: 500 })
  }
}

