"use client"

import { useState } from "react"
import { Play, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import { AudioPlayer } from "./audio-player"

const ELEVEN_LABS_VOICES = [
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
  { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam" },
]

export function TextToSpeechDemo() {
  const [text, setText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string>(ELEVEN_LABS_VOICES[0].voice_id)
  const [stability, setStability] = useState([0.75])
  const [similarity, setSimilarity] = useState([0.75])
  const [audioUrl, setAudioUrl] = useState<string>("")
  const { toast } = useToast()

  const handleTextToSpeech = async () => {
    if (!text) return

    try {
      setIsGenerating(true)
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: selectedVoice,
          stability: stability[0],
          similarity_boost: similarity[0],
        }),
      })

      if (!response.ok) throw new Error("Failed to convert text to speech")

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert text to speech. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text to Speech</CardTitle>
        <CardDescription>Convert text to lifelike speech using ElevenLabs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Text</Label>
          <Textarea
            placeholder="Enter text to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-4">
         

          <div className="space-y-2">
            <Label>Stability ({stability[0]})</Label>
            <Slider
              value={stability}
              onValueChange={setStability}
              min={0}
              max={1}
              step={0.05}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
          </div>

          <div className="space-y-2">
            <Label>Similarity Boost ({similarity[0]})</Label>
            <Slider
              value={similarity}
              onValueChange={setSimilarity}
              min={0}
              max={1}
              step={0.05}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
          </div>
          <div className="space-y-2">
            <Label>Voice Selection</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {ELEVEN_LABS_VOICES.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleTextToSpeech} disabled={!text || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Speech
              </>
            )}
          </Button>

          {audioUrl && <AudioPlayer src={audioUrl} onEnded={() => setIsGenerating(false)} className="pt-4" />}
        </div>
      </CardContent>
    </Card>
  )
}
