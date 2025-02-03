"use client"

import { useState, useRef, useEffect } from "react"
import {
  Mic,
  Square,
  SendHorizontal,
  Loader2,
  Volume2,
  VolumeX,
  Bot,
  User,
  MessageSquare,
  Copy,
  RefreshCw,
  Trash2,
  Keyboard,
} from "lucide-react"
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
import { motion, AnimatePresence } from "framer-motion"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  status?: "sending" | "sent" | "delivered" | "error"
  speaker?: string // Add speaker field
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

const MAX_MESSAGE_LENGTH = 1000
const KEYBOARD_SHORTCUTS = {
  send: "⌘ + ↵",
  record: "⌘ + R",
  clear: "⌘ + K",
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 Hello! I'm your AI assistant. You can ask me questions using voice or text. Try one of the sample questions below to get started.",
  timestamp: new Date(),
  status: "delivered",
}

export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
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
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [recognition, setRecognition] = useState<webkitSpeechRecognition | null>(null) // Updated type
  const [currentSpeaker, setCurrentSpeaker] = useState<string>("")

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scrollRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Send message with Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent)
      }
      // Start/stop recording with Cmd/Ctrl + R
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault()
        isRecording ? stopRecording() : startRecording()
      }
      // Clear chat with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handleClearChat()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [input, isRecording])

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore - webkit speech recognition is not in the types
      const recognition = new webkitSpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onstart = () => {
        console.log("Speech recognition started")
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex
        if (event.results[current].isFinal) {
          const transcript = event.results[current][0].transcript
          const confidence = event.results[current][0].confidence

          // Get speaker information if available
          let speaker = ""
          if (event.results[current].length > 1) {
            speaker = `Speaker ${(current % 2) + 1}` // Simple alternating speaker identification
          }

          setCurrentSpeaker(speaker)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error)
      }

      setRecognition(recognition)
    }
  }, [])

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        description: "Message copied to clipboard",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Failed to copy message",
      })
    }
  }

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE])
    setInput("")
    setAudioUrl("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const retryMessage = async (messageIndex: number) => {
    const messageToRetry = messages[messageIndex]
    if (messageToRetry.role !== "user") return

    // Remove all messages after this one
    setMessages(messages.slice(0, messageIndex + 1))
    // Retry the request
    await handleSubmit(null, messageToRetry.content)
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

      // Start speech recognition for speaker identification
      if (recognition) {
        recognition.start()
      }
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

      // Stop speech recognition
      if (recognition) {
        recognition.stop()
      }
    }
  }

  const handleSpeechToText = async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append("file", audioBlob)

    // Include speaker data if available
    if (currentSpeaker) {
      formData.append("speakerData", JSON.stringify({ speaker: currentSpeaker }))
    }

    try {
      setIsProcessing(true)
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to convert speech to text")

      const data = await response.json()
      setInput(data.text)

      // If there's speaker data, include it in the message
      if (data.speaker) {
        setMessages((prev) =>
          prev.map((msg) => (msg.role === "user" && !msg.speaker ? { ...msg, speaker: data.speaker.speaker } : msg)),
        )
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert speech to text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setCurrentSpeaker("")
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

  const handleSubmit = async (e?: React.FormEvent, retryContent?: string) => {
    if (e) e.preventDefault()
    const messageContent = retryContent || input
    if ((!messageContent.trim() && !retryContent) || isProcessing) return

    const messageId = Math.random().toString(36).substr(2, 9)
    setInput("")

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "user",
        content: messageContent,
        timestamp: new Date(),
        status: "sending",
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
          message: messageContent,
          history: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      // Update user message status
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, status: "delivered" } : msg)))

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      if (data.response) {
        const assistantMessageId = Math.random().toString(36).substr(2, 9)
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            status: "delivered",
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
          id: Math.random().toString(36).substr(2, 9),
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting. Please try again.",
          timestamp: new Date(),
          status: "error",
        },
      ])
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
              <CardTitle>Voice Chat</CardTitle>
              <CardDescription>Chat with AI using voice or text</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toast({
                        description:
                          "Keyboard Shortcuts: " +
                          Object.entries(KEYBOARD_SHORTCUTS)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", "),
                      })
                    }
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show keyboard shortcuts</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all messages from the chat. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearChat}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[calc(100%-4rem)]">
          <div className="flex-1 border-b min-h-0">
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
                        {message.speaker && <span className="text-xs text-muted-foreground">{message.speaker}</span>}
                        <div
                          className={`rounded-lg px-4 py-2 max-w-[85%] relative break-words whitespace-pre-wrap ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          {message.content}
                          <div
                            className={`absolute ${message.role === "user" ? "left-0" : "right-0"} top-full mt-1 hidden group-hover:flex items-center gap-2`}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {message.role === "user" && message.status === "error" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => retryMessage(index)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.status && (
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              {message.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isProcessing && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 space-y-4 flex-shrink-0">
            {SAMPLE_QUESTIONS.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border rounded-lg bg-muted/50"
              >
                <AudioVisualizer stream={stream} isRecording={isRecording} />
              </motion.div>
            )}

            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg p-4 bg-muted/50"
              >
                <AudioPlayer src={audioUrl} onEnded={() => setIsSpeaking(false)} />
              </motion.div>
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
                  <TooltipContent>
                    {isRecording
                      ? `Stop recording (${KEYBOARD_SHORTCUTS.record})`
                      : `Start recording (${KEYBOARD_SHORTCUTS.record})`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  placeholder="Type a message or use voice input..."
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
                  <TooltipContent>Send message ({KEYBOARD_SHORTCUTS.send})</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

