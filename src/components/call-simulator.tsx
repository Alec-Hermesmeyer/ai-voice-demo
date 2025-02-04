"use client"

import { useState, useEffect } from "react"
import { Phone, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { searchDocuments } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function CallSimulator() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSearching) return

    const userMessage = input
    setInput("") // Clear input immediately

    try {
      setIsSearching(true)
      // Add user message immediately
      setMessages((current) => [
        ...current,
        {
          id: Date.now().toString(),
          role: "user",
          content: userMessage,
        },
      ])

      console.log("Searching documents for:", userMessage)
      const searchResults = await searchDocuments(userMessage)
      console.log("Search results:", searchResults)

      if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
        console.log("No results found")
        setMessages((current) => [
          ...current,
          {
            id: Date.now().toString(),
            role: "assistant",
            content:
              "I apologize, but I don't have specific information about that. Let me transfer you to a human agent who can help you better.",
          },
        ])
        return
      }

      // Format the context from search results
      const context = searchResults.results
        .map((doc) => {
          const question = doc.metadata?.question || "Information"
          return `${question}: ${doc.content}`
        })
        .join("\n\n")

      console.log("Formatted context:", context)

      // Add AI response based on the search results
      setMessages((current) => [
        ...current,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: searchResults.results[0].content,
        },
      ])
    } catch (error) {
      console.error("Error in call simulator:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your request. Please try again.",
      })
      setMessages((current) => [
        ...current,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            "I apologize, but I'm having trouble accessing the information. Let me transfer you to a human agent.",
        },
      ])
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartCall = () => {
    setIsCallActive(true)
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Hello! Thank you for calling Dallas Boat Tours. How can I assist you today?",
      },
    ])
  }

  const handleEndCall = () => {
    setIsCallActive(false)
    setMessages([])
    setInput("")
    setIsSearching(false)
  }

  // Log the API URL on component mount
  useEffect(() => {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Call Simulator</CardTitle>
        <CardDescription>Test how the AI system handles different customer inquiries.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isCallActive ? (
            <Button className="w-full" size="lg" onClick={handleStartCall}>
              <Phone className="mr-2 h-4 w-4" />
              Start Test Call
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="h-[400px] border rounded-lg p-4 overflow-y-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-2 mb-4 ${message.role === "user" ? "justify-end" : ""}`}>
                    {message.role !== "user" && <Phone className="h-8 w-8 p-2 border rounded-full shrink-0" />}
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === "user" && <User className="h-8 w-8 p-2 border rounded-full shrink-0" />}
                  </div>
                ))}
                {isSearching && (
                  <div className="flex gap-2 mb-4">
                    <Phone className="h-8 w-8 p-2 border rounded-full shrink-0" />
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isSearching}
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </form>

              <Button variant="destructive" className="w-full" onClick={handleEndCall}>
                End Call
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

