import { VoiceChat } from "@/components/voice-chat"

export default function HomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Chat</h1>
        <p className="text-muted-foreground">Have a conversation with AI using voice or text</p>
      </div>
      <VoiceChat />
    </div>
  )
}

