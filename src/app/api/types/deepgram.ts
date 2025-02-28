export interface TranscriptionOptions {
    language?: string
    model?: string
    punctuate?: boolean
    profanity_filter?: boolean
    redact?: string[]
    diarize?: boolean
    smart_format?: boolean
    filler_words?: boolean
  }
  
  export interface TranscriptionResponse {
    transcript: string
    confidence: number
    words: Array<{
      word: string
      start: number
      end: number
      confidence: number
    }>
    speakers?: Array<{
      speaker: number
      confidence: number
    }>
  }
  
  export interface ErrorResponse {
    error: string
    status: number
  }
  