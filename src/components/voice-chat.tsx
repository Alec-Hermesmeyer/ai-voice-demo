"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, SendHorizontal, Loader2, Volume2, VolumeX, MessageSquare, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { AudioVisualizer } from "./audio-visualizer"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const MAX_MESSAGE_LENGTH = 1000
const CACHE_KEY = "voice_chat_messages"
const MAX_RETRIES = 3

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
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [stream, setStream] = useState<MediaStream>()

  const recognition = useRef<SpeechRecognition | null>(null)
  const lastFinalTranscript = useRef<string>("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scrollRef])

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition()
        recognition.current.continuous = true
        recognition.current.interimResults = true
        recognition.current.lang = "en-US"

        recognition.current.onresult = (event) => {
          let finalTranscript = lastFinalTranscript.current
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += " " + event.results[i][0].transcript
              // When we get final results, trigger grammar correction
              correctGrammar(finalTranscript.trim())
            } else {
              interimTranscript = event.results[i][0].transcript
            }
          }

          lastFinalTranscript.current = finalTranscript.trim()

          // Immediately update input with current transcription
          setInput(`${finalTranscript} ${interimTranscript}`.trim())
        }

        recognition.current.onerror = (event) => {
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

    return () => stopRecording()
  }, [toast])

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE])
    localStorage.setItem(CACHE_KEY, JSON.stringify([WELCOME_MESSAGE]))
    toast({
      title: "Chat cleared",
      description: "All messages have been cleared.",
    })
  }

  const startRecording = () => {
    if (recognition.current) {
      recognition.current.start()
      setIsRecording(true)
      lastFinalTranscript.current = ""
      setInput("")
    }
  }

  const stopRecording = () => {
    if (recognition.current) {
      recognition.current.stop()
      setIsRecording(false)
    }
  }

  const retryMessage = async (messageIndex: number) => {
    const messageToRetry = messages[messageIndex]
    if (messageToRetry.role !== "user") return

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
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          status: "delivered",
        },
      ])
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

  const correctGrammar = async (text: string) => {
    if (!text.trim()) return

    try {
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
        setInput(data.corrected)
        lastFinalTranscript.current = data.corrected
      }
    } catch (error) {
      console.error("Grammar correction error:", error)
      // On error, keep the uncorrected text
      setInput(text)
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Clear chat">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all messages. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearChat}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <ScrollArea className="flex-1">
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
              <div className="flex flex-wrap gap-2 justify-center">
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
                <Textarea
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  disabled={isProcessing}
                  className="pr-12 mt-4 min-h-[44px] max-h-[200px] resize-none overflow-y-auto pb-12"
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = "0"
                    target.style.height = `${target.scrollHeight}px`
                  }}
                />
                <span className="absolute right-3 top-8 text-xs text-muted-foreground">
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

