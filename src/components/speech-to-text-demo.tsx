"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: any) => void
  onerror: (event: any) => void
  start(): void
  stop(): void
}

export function SpeechToTextDemo() {
  const [isRecording, setIsRecording] = useState(false)
  const [rawTranscript, setRawTranscript] = useState("")
  const [correctedTranscript, setCorrectedTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const recognition = useRef<SpeechRecognition | null>(null)
  const correctionTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastFinalTranscript = useRef<string>("") // Track last finalized transcript
  const interimBuffer = useRef<string>("") // Buffer for interim results
  const bufferTimeout = useRef<NodeJS.Timeout | null>(null) // Timer for smoother updates
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition()
        if (recognition.current) {
          recognition.current.continuous = true
          recognition.current.interimResults = true
          recognition.current.lang = "en-US"
        }

        if (recognition.current) recognition.current.onresult = (event) => {
          let finalTranscript = lastFinalTranscript.current
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += " " + event.results[i][0].transcript
            } else {
              interimTranscript = event.results[i][0].transcript
            }
          }

          // Update finalized transcript
          lastFinalTranscript.current = finalTranscript.trim()

          // Buffer interim text to smooth out real-time display
          interimBuffer.current = interimTranscript.trim()

          // Delay updating UI to avoid flashing one word at a time
          if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
          bufferTimeout.current = setTimeout(() => {
            setRawTranscript(`${lastFinalTranscript.current} ${interimBuffer.current}`.trim())
          }, 250) // Update every 250ms for smoother flow
        }

        if (recognition.current) recognition.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          toast({
            title: "Error",
            description: `Speech recognition error: ${event.error}`,
            variant: "destructive",
          })
          stopRecording()
        }
      } else {
        toast({
          title: "Error",
          description: "Speech recognition is not supported in this browser.",
          variant: "destructive",
        })
      }
    }

    return () => {
      stopRecording()
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
    }
  }, [toast])

  const correctGrammar = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      try {
        setIsProcessing(true)
        const response = await fetch("/api/correct-grammar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) throw new Error("Grammar correction failed")

        const data = await response.json()
        if (data.corrected) {
          setCorrectedTranscript(data.corrected)
        }
      } catch (error) {
        console.error("Grammar correction error:", error)
        toast({
          title: "Error",
          description: "Failed to correct grammar. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (rawTranscript) {
      if (correctionTimeout.current) {
        clearTimeout(correctionTimeout.current)
      }
      correctionTimeout.current = setTimeout(() => {
        correctGrammar(rawTranscript)
      }, 1000)
    }
    return () => {
      if (correctionTimeout.current) {
        clearTimeout(correctionTimeout.current)
      }
    }
  }, [rawTranscript, correctGrammar])

  const startRecording = () => {
    try {
      if (recognition.current) {
        recognition.current.start()
        setIsRecording(true)
        lastFinalTranscript.current = "" // Reset tracking
        setRawTranscript("")
        setCorrectedTranscript("")
      }
    } catch (error) {
      console.error("Start recording error:", error)
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    try {
      if (recognition.current) {
        recognition.current.stop()
      }
    } catch (error) {
      console.error("Stop recording error:", error)
    } finally {
      setIsRecording(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Speech to Text</CardTitle>
        <CardDescription>See both raw and corrected transcription as you speak</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Raw Transcript (Real-time)</Label>
            <div className="relative rounded-md border p-4 min-h-[100px] bg-muted/50">
              <div className="whitespace-pre-wrap">{rawTranscript || "Start speaking..."}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Corrected Transcript</Label>
            <div className="relative rounded-md border p-4 min-h-[100px]">
              {isProcessing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{correctedTranscript || "Corrected text will appear here..."}</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
