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

import { NextResponse } from 'next/server';
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export const runtime = 'edge';

export async function GET(request: Request) {
  if (!process.env.DEEPGRAM_API_KEY) {
    return NextResponse.json({ error: 'Missing Deepgram API Key' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const audioUrl = searchParams.get('url') || 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service';

  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // Create WebSocket pair
    const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();
    serverSocket.accept();

    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      fetch(audioUrl)
        .then(response => response.body?.getReader())
        .then(reader => {
          const readStream = () => {
            reader?.read().then(({ done, value }) => {
              if (done) return connection.finish();
              if (connection.getReadyState() === WebSocket.OPEN) connection.send(value);
              readStream();
            });
          };
          readStream();
        });
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      if (serverSocket.readyState === WebSocket.OPEN) {
        serverSocket.send(JSON.stringify({
          transcript: data.channel.alternatives[0].transcript
        }));
      }
    });

    serverSocket.addEventListener('close', () => connection.finish());
    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('Deepgram error:', err);
      serverSocket.close(1011, 'Deepgram error');
    });

    return new Response(null, {
      status: 101,
      // @ts-ignore - WebSocket handling in Edge Runtime
      webSocket: clientSocket,
      headers: new Headers({
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      }),
    });

  } catch (error) {
    console.error('WebSocket error:', error);
    return NextResponse.json(
      { error: 'Connection failed' },
      { status: 500 }
    );
  }
}