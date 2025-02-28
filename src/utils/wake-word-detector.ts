

export class WakeWordDetector {
  private recognition: SpeechRecognition
  private isListening = false
  private wakeWord: string
  private onWakeCallback: () => void
  private confidenceThreshold = 0.8

  constructor(wakeWord = "hey assistant", onWake: () => void) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()
    this.wakeWord = wakeWord.toLowerCase()
    this.onWakeCallback = onWake

    // Configure recognition settings
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      if (result.isFinal) {
        const transcript = result[0].transcript.toLowerCase()
        const confidence = result[0].confidence

        if (confidence >= this.confidenceThreshold && this.containsWakeWord(transcript)) {
          // Play a subtle sound to indicate wake word detection
          this.playDetectionSound()
          this.onWakeCallback()
        }
      }
    }

    this.recognition.onerror = (event) => {
      console.error("Wake word detection error:", event.error)
      if (event.error === "no-speech") {
        this.restart()
      }
    }

    (this.recognition as any).onend = () => {
      if (this.isListening) {
        this.restart()
      }
    }
  }

  private containsWakeWord(transcript: string): boolean {
    const variations = [this.wakeWord, this.wakeWord.replace(" ", ""), this.wakeWord.replace(" ", "-")]
    return variations.some((variation) => transcript.includes(variation))
  }

  private playDetectionSound() {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime) // A5 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime) // Low volume

    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    oscillator.stop(audioContext.currentTime + 0.3)
  }

  start() {
    if (!this.isListening) {
      this.recognition.start()
      this.isListening = true
    }
  }

  stop() {
    if (this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  restart() {
    this.stop()
    setTimeout(() => this.start(), 100)
  }
}

