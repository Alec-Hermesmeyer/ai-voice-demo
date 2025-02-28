import { type NextRequest, NextResponse } from "next/server"
import { createDeepgramRequest, formatDeepgramResponse } from "../../utils/deepgram"
import type { TranscriptionOptions, ErrorResponse } from "../../types/deepgram"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioChunk = formData.get("audio") as File

    if (!audioChunk) {
      return NextResponse.json<ErrorResponse>({ error: "No audio chunk provided", status: 400 }, { status: 400 })
    }

    // Get transcription options with streaming-specific defaults
    const options: TranscriptionOptions = {
      language: (formData.get("language") as string) || "en-US",
      model: "nova", // Using nova model which is optimized for real-time
      punctuate: true,
      smart_format: true,
      filler_words: false, // Disable for real-time to improve performance
    }

    const buffer = Buffer.from(await audioChunk.arrayBuffer())
    const response = await createDeepgramRequest(buffer, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Deepgram API error:", errorText)
      return NextResponse.json<ErrorResponse>(
        { error: "Failed to transcribe audio chunk", status: response.status },
        { status: response.status },
      )
    }

    const data = await response.json()
    const formattedResponse = formatDeepgramResponse(data)

    return NextResponse.json({
      ...formattedResponse,
      isComplete: formData.get("isLastChunk") === "true",
    })
  } catch (error) {
    console.error("Error processing real-time transcription:", error)
    return NextResponse.json<ErrorResponse>({ error: "Internal server error", status: 500 }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
