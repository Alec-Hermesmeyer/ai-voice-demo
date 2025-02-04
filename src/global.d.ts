// globals.d.ts
interface Window {
    webkitSpeechRecognition: any;
  }
  
  interface SpeechRecognitionEvent extends Event {
    results: any[];
    resultIndex: number;
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: (event: any) => void
    onerror: (event: any) => void
    start(): void
    stop(): void
  }