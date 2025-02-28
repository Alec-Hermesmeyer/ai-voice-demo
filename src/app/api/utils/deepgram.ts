interface TranscriptionOptions {
    language?: string
    model?: string
    punctuate?: boolean
    profanity_filter?: boolean
    diarize?: boolean
    smart_format?: boolean
    filler_words?: boolean
    redact?: string[]
  }
  
  interface TranscriptionResponse {
    transcript: string
    confidence: number
    words: any[]
    speakers: any[]
  }
  
  export async function createDeepgramRequest(audio: Buffer, options: TranscriptionOptions) {
    const queryParams = new URLSearchParams()
  
    if (options.language) queryParams.append("language", options.language)
    if (options.model) queryParams.append("model", options.model)
    if (options.punctuate) queryParams.append("punctuate", "true")
    if (options.profanity_filter) queryParams.append("profanity_filter", "true")
    if (options.diarize) queryParams.append("diarize", "true")
    if (options.smart_format) queryParams.append("smart_format", "true")
    if (options.filler_words) queryParams.append("filler_words", "true")
  
    if (options.redact && options.redact.length > 0) {
      queryParams.append("redact", options.redact.join(","))
    }
  
    const url = `https://api.deepgram.com/v1/listen?${queryParams.toString()}`
  
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/wav",
      },
      body: audio,
    })
  }
  
  export function formatDeepgramResponse(data: any): TranscriptionResponse {
    return {
      transcript: data.results?.channels[0]?.alternatives[0]?.transcript || "",
      confidence: data.results?.channels[0]?.alternatives[0]?.confidence || 0,
      words: data.results?.channels[0]?.alternatives[0]?.words || [],
      speakers: data.results?.channels[0]?.alternatives[0]?.speaker_labels || [],
    }
  }
  