import { VoiceDemos } from "@/components/voice-demos"

export default function DemosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Demos</h1>
        <p className="text-muted-foreground">Test speech-to-text and text-to-speech capabilities</p>
      </div>
      <VoiceDemos />
    </div>
  )
}

