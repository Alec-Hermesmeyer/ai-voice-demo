import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    models: [
      { id: "general", name: "General Purpose", description: "Best for most use cases" },
      { id: "nova", name: "Nova", description: "Optimized for real-time transcription" },
      { id: "enhanced", name: "Enhanced", description: "Higher accuracy for clear audio" },
      { id: "meeting", name: "Meeting", description: "Optimized for multi-speaker meetings" },
    ],
    languages: [
      { code: "en-US", name: "English (US)" },
      { code: "en-GB", name: "English (UK)" },
      { code: "en-AU", name: "English (Australia)" },
      { code: "en-IN", name: "English (India)" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "nl", name: "Dutch" },
      { code: "ja", name: "Japanese" },
      { code: "ko", name: "Korean" },
      { code: "zh", name: "Chinese" },
    ],
    features: {
      punctuation: true,
      diarization: true,
      smart_format: true,
      filler_words: true,
      profanity_filter: true,
      redaction: true,
    },
  })
}