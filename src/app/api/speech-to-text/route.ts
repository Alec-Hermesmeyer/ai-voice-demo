import { type NextRequest, NextResponse } from "next/server"
import type { DeepgramResponse, TranscriptionOptions } from "@/types/deepgram"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const options: TranscriptionOptions = {
      language: (formData.get("language") as string) || "en-US",
      diarization: formData.get("diarization") === "true",
      sentiment: formData.get("sentiment") === "true",
      keywords: formData.get("keywords") ? (formData.get("keywords") as string).split(",") : undefined,
    }

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Construct Deepgram API parameters
    const deepgramParams = {
      smart_format: true, // Enables punctuation and capitalization
      diarize: options.diarization, // Speaker identification
      language: options.language,
      detect_language: true,
      sentiment: options.sentiment,
      keywords: options.keywords?.join(","),
      utterances: true, // Split audio into speaker segments
    }

    // Convert params to query string
    const queryString = new URLSearchParams(
      Object.entries(deepgramParams)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    ).toString()

    // Call Deepgram API with enhanced parameters
    const response = await fetch(`https://api.deepgram.com/v1/listen?${queryString}`, {
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

    // Process and structure the response
    const result: DeepgramResponse = {
      transcript: data.results?.channels[0]?.alternatives[0]?.transcript || "",
      confidence: data.results?.channels[0]?.alternatives[0]?.confidence || 0,
      words: data.results?.channels[0]?.alternatives[0]?.words || [],
      speakers: data.results?.channels[0]?.speaker_count || 1,
      sentiment: {
        overall: calculateOverallSentiment(data),
        segments: extractSentimentSegments(data),
      },
    }

    // Add keyword detection results if keywords were provided
    if (options.keywords) {
      const keywordHits = extractKeywordHits(data, options.keywords)
      return NextResponse.json({
        ...result,
        keywords: keywordHits,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing transcription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateOverallSentiment(data: any): "positive" | "negative" | "neutral" {
  if (!data.results?.channels[0]?.alternatives[0]?.sentiment) {
    return "neutral"
  }

  const sentiments = data.results.channels[0].alternatives[0].sentiment
  const sentimentCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
  }

  sentiments.forEach((s: { sentiment: "positive" | "negative" | "neutral" }) => {
    sentimentCounts[s.sentiment]++
  })

  if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > sentimentCounts.neutral) {
    return "positive"
  } else if (
    sentimentCounts.negative > sentimentCounts.positive &&
    sentimentCounts.negative > sentimentCounts.neutral
  ) {
    return "negative"
  }
  return "neutral"
}

function extractSentimentSegments(data: any) {
  if (!data.results?.channels[0]?.alternatives[0]?.sentiment) {
    return []
  }

  return data.results.channels[0].alternatives[0].sentiment.map((s: any) => ({
    sentiment: s.sentiment,
    start: s.start,
    end: s.end,
  }))
}

function extractKeywordHits(data: any, keywords: string[]) {
  const hits: Record<string, number> = {}
  keywords.forEach((keyword) => {
    hits[keyword] = 0
  })

  const words = data.results?.channels[0]?.alternatives[0]?.words || []
  words.forEach((word: any) => {
    if (keywords.includes(word.word.toLowerCase())) {
      hits[word.word.toLowerCase()]++
    }
  })

  return hits
}

export const config = {
  api: {
    bodyParser: false,
  },
}

