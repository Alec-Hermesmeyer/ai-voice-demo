import { NextResponse } from "next/server"

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY

if (!ELEVEN_LABS_API_KEY) {
  throw new Error("Missing ELEVEN_LABS_API_KEY environment variable")
}

export async function POST(req: Request) {
  try {
    const { text, voice_id, stability, similarity_boost } = await req.json()

    // Add logging to debug the request
    console.log("Text-to-speech request:", {
      text,
      voice_id,
      stability,
      similarity_boost,
    })

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY as string,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability,
          similarity_boost,
        },
      }),
    })

    // Log the response status and any error details
    console.log("ElevenLabs API response status:", response.status)
    if (!response.ok) {
      const errorText = await response.text()
      console.error("ElevenLabs API error:", errorText)
      throw new Error(`Failed to convert text to speech: ${errorText}`)
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Error in text-to-speech:", error)
    return NextResponse.json(
      { error: "Failed to convert text to speech", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

