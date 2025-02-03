"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  stream?: MediaStream
  isRecording: boolean
}

export function AudioVisualizer({ stream, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    dataArrayRef.current = dataArray

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!

    function draw() {
      if (!isRecording) return

      const width = canvas.width
      const height = canvas.height

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = "rgb(255, 255, 255)"
      ctx.fillRect(0, 0, width, height)

      const barWidth = (width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2

        const gradient = ctx.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, "hsl(221.2 83.2% 53.3%)")
        gradient.addColorStop(1, "hsla(221.2 83.2% 53.3% / 0.3)")

        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      audioContext.close()
    }
  }, [stream, isRecording])

  return <canvas ref={canvasRef} width={300} height={100} className="w-full rounded-lg border bg-white" />
}

