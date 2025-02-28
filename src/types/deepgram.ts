export interface DeepgramWord {
    word: string
    start: number
    end: number
    confidence: number
    speaker?: number
    sentiment?: "positive" | "negative" | "neutral"
  }
  
  export interface DeepgramResponse {
    transcript: string
    confidence: number
    words: DeepgramWord[]
    speakers: number
    sentiment: {
      overall: "positive" | "negative" | "neutral"
      segments: Array<{
        sentiment: "positive" | "negative" | "neutral"
        start: number
        end: number
      }>
    }
  }
  
  export interface TranscriptionOptions {
    language?: string
    keywords?: string[]
    diarization?: boolean
    sentiment?: boolean
  }
  