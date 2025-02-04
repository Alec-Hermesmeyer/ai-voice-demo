import { createOpenAI } from "@ai-sdk/openai"
import { streamText } from "ai"

const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function formatKnowledgeResponse(content: string, query: string): Promise<string> {
  try {
    const result = await streamText({
      model: openaiClient("gpt-4-turbo"),
      messages: [
        {
          role: "system",
          content: `You are an AI phone assistant helping format knowledge base responses.
          Format the information in a conversational, clear way that would work well in a phone call.
          - Keep the tone friendly and professional
          - Break down long information into digestible parts
          - Use natural pauses and transitions
          - Organize related information together
          - Keep responses concise but complete
          - Use polite, clear language
          - Format lists or options in a way that's easy to follow in conversation`,
        },
        {
          role: "user",
          content: `Question: ${query}\nInformation: ${content}`,
        },
      ],
    })

    // Properly handle the stream and accumulate the text
    let text = ''
    for await (const delta of result.textStream) {
      text += delta
    }
    
    return text
  } catch (error) {
    console.error("Error formatting response:", error)
    return content // Fallback to original content if formatting fails
  }
}