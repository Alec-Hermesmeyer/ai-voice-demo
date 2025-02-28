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
import { openDB } from "idb";


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

const VOICE_COMMANDS = [
  {
    pattern: /^\s*(send|submit|say)\s*(.+)/i, // Use .+ to ensure non-empty content
    action: (_: any, content: string) => content.trim() // Return trimmed message content
  },
  {
    pattern: /^\s*correct grammar\s*$/i,
    action: (...args: string[]) => 'CORRECT_GRAMMAR'
  },
  {
    pattern: /^\s*clear chat\s*$/i,
    action: (...args: string[]) => 'CLEAR_CHAT'
  },
  {
    pattern: /^\s*(enable|turn on) auto-?speak\s*$/i,
    action: (...args: string[]) => 'ENABLE_AUTOSPEAK'
  },
  {
    pattern: /^\s*(disable|turn off) auto-?speak\s*$/i,
    action: (...args: string[]) => 'DISABLE_AUTOSPEAK'
  },
  {
    pattern: /^\s*delete message\s*$/i,
    action: (...args: string[]) => 'DELETE_LAST'
  },
  {
    pattern: /^\s*help\s*$/i,
    action: (...args: string[]) => 'SHOW_HELP'
  }
]
export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const cachedMessages = localStorage.getItem(CACHE_KEY)
      return cachedMessages ? JSON.parse(cachedMessages) : [WELCOME_MESSAGE]
    }
    return [WELCOME_MESSAGE]
  })
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [stream, setStream] = useState<MediaStream>()
  const silenceTimeout = useRef<NodeJS.Timeout | null>(null)
  const awaitingCommand = useRef(false)
  const recognition = useRef<SpeechRecognition | null>(null)
  const lastFinalTranscript = useRef<string>("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const COMMAND_FEEDBACK = {
    CLEAR_CHAT: 'Chat history has been cleared',
    ENABLE_AUTOSPEAK: 'Auto-speak enabled',
    DISABLE_AUTOSPEAK: 'Auto-speak disabled',
    DELETE_LAST: 'Last message deleted',
    SHOW_HELP: `Available commands: ${VOICE_COMMANDS.map(cmd => cmd.pattern.source.replace(/\\s*\^\\s*|\\s*\$/gi, '')).join(', ')}`
  }

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
        if (recognition.current) {
          recognition.current.continuous = true
          recognition.current.interimResults = true
          recognition.current.lang = "en-US"
        }

        recognition.current!.onresult = (event) => {
          let finalTranscript = lastFinalTranscript.current
          let interimTranscript = ""
          let hasFinal = false

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const { transcript, confidence } = event.results[i][0]
            if (event.results[i].isFinal && confidence > 0.7) {
              finalTranscript += " " + transcript
              hasFinal = true
            } else {
              interimTranscript = transcript
            }
          }

          if (hasFinal) {
            const processedTranscript = finalTranscript.trim()
            const command = detectCommand(processedTranscript)

            if (command) {
              handleCommand(command)
              lastFinalTranscript.current = ""
              setInput("")
              awaitingCommand.current = false
            } else {
              lastFinalTranscript.current = processedTranscript
              setInput(prev => `${prev} ${processedTranscript}`.trim())
              awaitingCommand.current = true
            }
          }

          // Auto-submit logic
          if (interimTranscript) {
            if (silenceTimeout.current !== null) {
              clearTimeout(silenceTimeout.current)
            }
            silenceTimeout.current = setTimeout(() => {
              if (input.trim() && !awaitingCommand.current) {
                handleSubmit()
              }
              awaitingCommand.current = false
            }, 1500)
          }
        }

        recognition.current!.onerror = (event) => {
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle recording with Ctrl/Cmd+Shift+R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
          toast({ description: "Recording stopped 🎙️" });
        } else {
          startRecording();
          toast({ description: "Recording started 🎙️🔴" });
        }
      }

      // Submit with Ctrl/Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isProcessing && input.trim()) {
          handleSubmit();
        }
      }

      // Focus textarea with /
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, input, isProcessing]);

  // Add keyboard hint component
  function KeyboardHint() {
    return (
      <div className="flex gap-2 text-sm text-muted-foreground items-center justify-center">
        <kbd className="px-2 py-1 bg-muted rounded-sm">⌘⏎ Send</kbd>
        <kbd className="px-2 py-1 bg-muted rounded-sm">⌘⇧R Record</kbd>
        <kbd className="px-2 py-1 bg-muted rounded-sm">/ Focus</kbd>
      </div>
    );
  }
  const detectCommand = (transcript: string): Command | null => {
    for (const cmd of VOICE_COMMANDS) {
      const match = transcript.match(cmd.pattern)
      if (match) {
        const result = cmd.action(...match.slice(1))
        return { type: typeof result === 'string' ? result : cmd.pattern.source, match: match[0] }
      }
    }
    return null
  }

  interface Command {
    type: keyof typeof COMMAND_FEEDBACK | string;
    match: string;
  }

  const handleCommand = (command: Command) => {
    switch (command.type) {
      case 'CLEAR_CHAT':
        clearChat()
        break
      case 'ENABLE_AUTOSPEAK':
        setAutoSpeak(true)
        break
      case 'DISABLE_AUTOSPEAK':
        setAutoSpeak(false)
        break
      case 'DELETE_LAST':
        setMessages(prev => prev.slice(0, -1))
        break
      case 'SHOW_HELP':
        toast({ title: 'Voice Commands', description: COMMAND_FEEDBACK.SHOW_HELP })
        break
      default:
        if (typeof command.type === 'string') {
          handleSubmit(undefined, command.type)
        }
    }

    if (COMMAND_FEEDBACK[command.type as keyof typeof COMMAND_FEEDBACK]) {
      toast({ title: 'Command Executed', description: COMMAND_FEEDBACK[command.type as keyof typeof COMMAND_FEEDBACK] })
      speakText(COMMAND_FEEDBACK[command.type as keyof typeof COMMAND_FEEDBACK])
    }
  }


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
  const getDB = async () => {
    return openDB("tts-audio-cache", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("audio")) {
          db.createObjectStore("audio");
        }
      },
    });
  };

  // Function to store audio in IndexedDB
  const storeAudio = async (key: string, blob: Blob) => {
    const db = await getDB();
    await db.put("audio", blob, key);
  };

  // Function to retrieve audio from IndexedDB
  const getAudio = async (key: string) => {
    const db = await getDB();
    return db.get("audio", key);
  };

  // Function to generate a unique hash for text
  const generateHash = (text: string) => {
    return btoa(unescape(encodeURIComponent(text))).slice(0, 10); // Shortened base64 encoding
  };

  const preResponseTexts = [
    "Let me think...",
    "One moment please...",
    "Processing your request...",
    "Just a second...",
  ];

  const speakText = async (text: string, isPreResponse = false) => {
    if (!autoSpeak) return; // Only play if autoSpeak is enabled

    try {
      let textToSpeak = text;
      if (isPreResponse) {
        textToSpeak = preResponseTexts[Math.floor(Math.random() * preResponseTexts.length)];
      }

      const cacheKey = `tts_cache_${generateHash(textToSpeak)}`;

      // 🔍 Check if audio is already stored in IndexedDB
      const cachedAudioBlob = await getAudio(cacheKey);
      if (cachedAudioBlob) {
        console.log("Playing cached TTS audio for:", textToSpeak);
        const audio = new Audio(URL.createObjectURL(cachedAudioBlob));
        audio.play();
        return;
      }

      console.log("Requesting TTS for:", textToSpeak);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!response.ok) {
        console.error("TTS Fetch Error:", await response.text());
        throw new Error("Failed to fetch TTS audio");
      }

      console.log("TTS response received");
      const audioBlob = await response.blob();

      // 📌 Store the audio in IndexedDB for future use
      await storeAudio(cacheKey, audioBlob);

      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, retryContent?: string) => {
    if (e) e.preventDefault();
    let messageContent = retryContent || input;
    if (!messageContent.trim() || isProcessing) return;

    setInput("");
    setIsProcessing(true);

    // Add temporary uncorrected message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      status: "sending"
    }]);

    try {
      // Correct grammar before sending to API
      const correctedContent = await correctGrammar(messageContent);

      // Update message with corrected content
      setMessages(prev => prev.map(msg =>
        msg.id === String(Date.now())
          ? { ...msg, content: correctedContent }
          : msg
      ));

      // Play pre-response audio
      await speakText("", true);

      // Send corrected content to API
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: correctedContent,
          history: messages.map(msg => ({ role: msg.role, content: msg.content }))
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        status: "delivered"
      }]);

      speakText(data.response);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => prev.map(msg =>
        msg.id === String(Date.now())
          ? { ...msg, status: "error", retries: (msg.retries || 0) + 1 }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  // Updated correctGrammar function
  const correctGrammar = async (text: string): Promise<string> => {
    if (!text.trim()) return text;

    try {
      const response = await fetch("/api/correct-grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Grammar correction failed");

      const data = await response.json();
      return data.corrected || text;
    } catch (error) {
      console.error("Grammar correction error:", error);
      return text;
    }
  };

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
              <AnimatePresence initial={true}>
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
                      className={`rounded-lg px-4 py-2 max-w-[85%] relative break-words whitespace-pre-wrap ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
          <KeyboardHint />
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
                aria-live="polite"
              >
                {isRecording ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <Square className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type a message or speak..."
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  disabled={isProcessing}
                  className="pr-12 mt-4 min-h-[44px] max-h-[200px] resize-none overflow-y-auto pb-12"
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={1}
                  onKeyDown={(e) => {
                    // Allow new lines with Shift+Enter
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
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

