import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Call Deepgram API
    const response = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/wav",
      },
      body: buffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Deepgram API error:", errorText)
      return NextResponse.json({ error: "Failed to transcribe audio" }, { status: response.status })
    }

    const data = await response.json()
    const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || ""

    return NextResponse.json({ transcript })
  } catch (error) {
    console.error("Error processing transcription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

