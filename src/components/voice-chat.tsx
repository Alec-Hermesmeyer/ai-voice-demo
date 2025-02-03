"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, SendHorizontal, Loader2, Volume2, VolumeX, Bot, User, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { AudioVisualizer } from "./audio-visualizer"
import { AudioPlayer } from "./audio-player"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Default voice settings
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM" // Rachel voice
const VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.75,
}

// Sample questions
const SAMPLE_QUESTIONS = [
  "What policies are available to review?",
  "Summarize the proposal for American Revelry",
  "What is the TRIA coverage?",
]

export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [stream, setStream] = useState<MediaStream>()
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scrollRef]) // Corrected dependency

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(audioStream)
      mediaRecorder.current = new MediaRecorder(audioStream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data)
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" })
        await handleSpeechToText(audioBlob)
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      stream?.getTracks().forEach((track) => track.stop())
      setStream(undefined)
      setIsRecording(false)
    }
  }

  const handleSpeechToText = async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append("file", audioBlob)

    try {
      setIsProcessing(true)
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to convert speech to text")

      const data = await response.json()
      setInput(data.text)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert speech to text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true)
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: VOICE_ID,
          stability: VOICE_SETTINGS.stability,
          similarity_boost: VOICE_SETTINGS.similarity_boost,
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
      setIsSpeaking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    setInput("")

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ])

    try {
      setIsProcessing(true)
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          },
        ])

        // Automatically speak the response if enabled
        if (autoSpeak) {
          await speakResponse(data.response)
        }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      })
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Voice Chat</CardTitle>
              <CardDescription>Chat with AI using voice or text</CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setAutoSpeak(!autoSpeak)}>
                  {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[700px]">
          <div className="flex-1 border-b">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-6 p-4" ref={scrollRef}>
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8">
                      {message.role === "assistant" ? (
                        <>
                          <AvatarImage src="/bot-avatar.png" alt="AI Assistant" />
                          <AvatarFallback>
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage src="/user-avatar.png" alt="User" />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className={`group flex flex-col gap-1 ${message.role === "user" ? "items-end" : ""}`}>
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[85%] ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="text-xs text-muted-foreground px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 space-y-4">
            {SAMPLE_QUESTIONS.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((question) => (
                  <Badge
                    key={question}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            )}

            {isRecording && stream && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <AudioVisualizer stream={stream} isRecording={isRecording} />
              </div>
            )}

            {audioUrl && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <AudioPlayer src={audioUrl} onEnded={() => setIsSpeaking(false)} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className="shrink-0"
                    >
                      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRecording ? "Stop recording" : "Start recording"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Input
                placeholder="Type a message or use voice input..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
                className="flex-1"
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" disabled={!input.trim() || isProcessing} className="shrink-0">
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

