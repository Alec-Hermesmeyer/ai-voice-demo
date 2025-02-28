// import { NextResponse } from "next/server"
// import OpenAI from "openai"

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

// export const runtime = "nodejs"

// export async function POST(req: Request) {
//   try {
//     const formData = await req.formData()
//     const audioBlob = formData.get("chunk") as Blob
//     const audioFile = new File([audioBlob], "audio.wav", { type: audioBlob.type, lastModified: Date.now() })

//     if (!audioBlob) {
//       console.error("No audio chunk provided")
//       return NextResponse.json({ error: "No audio chunk provided" }, { status: 400 })
//     }

//     console.log("Received audio chunk:", {
//       size: audioBlob.size,
//       type: audioBlob.type,
//     })

//     if (audioBlob.size === 0) {
//       console.error("Empty audio chunk received")
//       return NextResponse.json({ error: "Empty audio chunk received" }, { status: 400 })
//     }

//     // Get raw transcription from Whisper
//     const transcription = await openai.audio.transcriptions.create({
//       file: audioFile,
//       model: "whisper-1",
//     })

//     console.log("Transcription received:", transcription.text)

//     return NextResponse.json({
//       text: transcription.text,
//       success: true,
//     })
//   } catch (error) {
//     console.error("Transcription error:", error)
//     return NextResponse.json(
//       {
//         error: "Transcription failed",
//         details: error instanceof Error ? error.message : "Unknown error",
//         success: false,
//       },
//       { status: 500 },
//     )
//   }
// }

import { NextResponse } from "next/server";
import { WebSocketServer } from "ws";
import { Deepgram} from "@deepgram/sdk";
import { IncomingMessage } from "http";

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY || "");

export const runtime = "nodejs";

const wss = new WebSocketServer({ noServer: true });
export async function GET(req: Request & IncomingMessage) {
  if (!process.env.DEEPGRAM_API_KEY) {
    return NextResponse.json({ error: "Missing Deepgram API Key" }, { status: 500 });
  }

  const response = new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });

  const { headers } = req;
  const socketKey = headers.get("sec-websocket-key");
  if (!socketKey) {
    return NextResponse.json({ error: "Missing WebSocket key" }, { status: 400 });
  }
  wss.handleUpgrade(req as IncomingMessage, req.socket as any, Buffer.alloc(0), (ws) => {
    console.log("🔗 WebSocket connection established");

    const deepgramLive = deepgram.transcription.live({
      model: "nova-3",
      smart_format: true,
      language: "en-US",
    });

    deepgramLive.on("transcriptReceived", (transcription: any) => {
      if (transcription.channel.alternatives[0].transcript) {
        console.log("📜 Transcription:", transcription.channel.alternatives[0].transcript);
        ws.send(JSON.stringify({ text: transcription.channel.alternatives[0].transcript }));
      }
    });

    deepgramLive.on("error", (err: unknown) => {
      console.error("Deepgram error:", err);
      ws.send(JSON.stringify({ error: "Deepgram error" }));
      ws.close();
    });

    ws.on("message", (message) => {
      if (deepgramLive.isReady) {
        deepgramLive.send(message);
      }
    });

    ws.on("close", () => {
      console.log("🔌 WebSocket closed");
      deepgramLive.finish();
    });
  });

  return response;
}
