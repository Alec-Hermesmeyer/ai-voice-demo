import { NextResponse } from "next/server"

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY

if (!ELEVEN_LABS_API_KEY) {
  throw new Error("Missing ELEVEN_LABS_API_KEY environment variable")
}

export async function POST(req: Request) {
  try {
    const { text, voice_id, stability, similarity_boost } = await req.json()

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_LABS_API_KEY!,
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

    if (!response.ok) {
      throw new Error("Failed to convert text to speech")
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
    return NextResponse.json({ error: "Failed to convert text to speech" }, { status: 500 })
  }
}
