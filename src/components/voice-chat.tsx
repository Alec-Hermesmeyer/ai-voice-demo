"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, SendHorizontal, Loader2, Volume2, VolumeX, MessageSquare, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { AudioVisualizer } from "./audio-visualizer"
import { motion, AnimatePresence } from "framer-motion"

// Constants
const MAX_RETRIES = 3
const CACHE_KEY = "voice_chat_messages"
const MAX_MESSAGE_LENGTH = 1000
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM" // Rachel voice
const VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.75,
}

const SAMPLE_QUESTIONS = [
  "What policies are available to review?",
  "Summarize the proposal for American Revelry",
  "What is the TRIA coverage?",
]

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  status?: "sending" | "sent" | "delivered" | "error"
  retries?: number
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "👋 Hello! I'm your AI assistant. Ask me anything using voice or text.",
  timestamp: new Date(),
  status: "delivered",
}

export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const cachedMessages = localStorage.getItem(CACHE_KEY)
      return cachedMessages ? JSON.parse(cachedMessages) : [WELCOME_MESSAGE]
    }
    return [WELCOME_MESSAGE]
  })

  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scrollRef]) // Corrected dependency

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(messages))
  }, [messages])

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
      await handleSubmit(undefined, data.text)
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

  const retryMessage = async (messageIndex: number) => {
    const messageToRetry = messages[messageIndex]
    if (messageToRetry.role !== "user") return

    // Remove all messages after this one
    setMessages(messages.slice(0, messageIndex + 1))
    await handleSubmit(undefined, messageToRetry.content)
  }

  const handleSubmit = async (e?: React.FormEvent, retryContent?: string, retries = 0) => {
    if (e) e.preventDefault()
    const messageContent = retryContent || input
    if (!messageContent.trim() || isProcessing) return

    const messageId = Math.random().toString(36).substr(2, 9)
    setInput("")

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "user",
        content: messageContent,
        timestamp: new Date(),
        status: "sending",
        retries,
      },
    ])

    try {
      setIsProcessing(true)
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      const assistantMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant" as const,
        content: data.response,
        timestamp: new Date(),
        status: "delivered" as const,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Auto-speak the response if enabled
      if (autoSpeak) {
        await speakResponse(data.response)
      }
    } catch (error) {
      console.error("Chat error:", error)

      if (retries < MAX_RETRIES) {
        setTimeout(() => handleSubmit(undefined, messageContent, retries + 1), 2000)
      } else {
        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, status: "error" } : msg)))
        toast({
          title: "Error",
          description: "Failed to get response. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardDescription>Chat with your Data</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <ScrollArea className="h-full max-h-[calc(100vh-20rem)] min-h-[400px]">
            <div className="flex flex-col gap-6 p-4" ref={scrollRef}>
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[85%] relative break-words whitespace-pre-wrap ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.content}
                      {message.status === "error" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={() => retryMessage(index)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <div className="p-4 space-y-4 flex-shrink-0">
            {SAMPLE_QUESTIONS.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((question) => (
                  <Button
                    key={question}
                    variant="secondary"
                    size="sm"
                    className="text-sm"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}

            {isRecording && stream && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <AudioVisualizer stream={stream} isRecording={isRecording} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
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

              <div className="relative flex-1">
                <Input
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  disabled={isProcessing}
                  className="pr-12"
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>

              <Button type="submit" disabled={!input.trim() || isProcessing} className="shrink-0">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

