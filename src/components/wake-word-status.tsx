"use client"

import { Mic, MicOff } from "lucide-react"
import { motion } from "framer-motion"

interface WakeWordStatusProps {
  isEnabled: boolean
  isListening: boolean
}

export function WakeWordStatus({ isEnabled, isListening }: WakeWordStatusProps) {
  if (!isEnabled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <MicOff className="h-4 w-4" />
        <span className="text-xs">Wake word disabled</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-primary">
      <motion.div
        animate={
          isListening
            ? {
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <Mic className="h-4 w-4" />
      </motion.div>
      <span className="text-xs">Listening for "Hey Assistant"</span>
    </div>
  )
}

