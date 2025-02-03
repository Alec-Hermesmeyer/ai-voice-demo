"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpeechToTextDemo } from "./speech-to-text-demo"
import { TextToSpeechDemo } from "./text-to-speech-demo"

export function VoiceDemos() {
  const [activeTab, setActiveTab] = useState("speech-to-text")

  return (
    <div className="max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="speech-to-text">Speech to Text</TabsTrigger>
          <TabsTrigger value="text-to-speech">Text to Speech</TabsTrigger>
        </TabsList>
        <TabsContent value="speech-to-text">
          <SpeechToTextDemo />
        </TabsContent>
        <TabsContent value="text-to-speech">
          <TextToSpeechDemo />
        </TabsContent>
      </Tabs>
    </div>
  )
}
