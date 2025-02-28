import type { DeepgramWord, DeepgramResponse } from "@/types/deepgram"

export function formatTranscriptionResults(response: DeepgramResponse) {
  const speakerSegments = groupBySpeaker(response.words)
  const sentimentAnalysis = analyzeSentimentTrends(response.sentiment.segments)

  return {
    summary: {
      totalSpeakers: response.speakers,
      overallSentiment: response.sentiment.overall,
      averageConfidence: calculateAverageConfidence(response.words),
    },
    speakerSegments,
    sentimentAnalysis,
  }
}

function groupBySpeaker(words: DeepgramWord[]) {
  const segments: Record<number, { text: string; words: DeepgramWord[] }> = {}

  words.forEach((word) => {
    if (word.speaker !== undefined) {
      if (!segments[word.speaker]) {
        segments[word.speaker] = { text: "", words: [] }
      }
      segments[word.speaker].text += ` ${word.word}`
      segments[word.speaker].words.push(word)
    }
  })

  return Object.entries(segments).map(([speaker, data]) => ({
    speaker: Number.parseInt(speaker),
    text: data.text.trim(),
    words: data.words,
  }))
}

function analyzeSentimentTrends(segments: DeepgramResponse["sentiment"]["segments"]) {
  const trends = {
    positive: 0,
    negative: 0,
    neutral: 0,
  }

  segments.forEach((segment) => {
    trends[segment.sentiment]++
  })

  return {
    ...trends,
    dominantSentiment: Object.entries(trends).reduce((a, b) => (a[1] > b[1] ? a : b))[0],
  }
}

function calculateAverageConfidence(words: DeepgramWord[]) {
  if (words.length === 0) return 0
  const sum = words.reduce((acc, word) => acc + word.confidence, 0)
  return sum / words.length
}