import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://api.deepgram.com/v1/projects", {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: "Deepgram API is not accessible" },
        { status: response.status },
      )
    }

    return NextResponse.json({ status: "ok", message: "Deepgram API is accessible" })
  } catch (error) {
    return NextResponse.json({ status: "error", message: "Failed to check API status" }, { status: 500 })
  }
}

