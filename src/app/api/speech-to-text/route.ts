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
    const protocol = request.headers.get('sec-websocket-protocol')?.split(', ')[1] || '';

    // Create the WebSocket response
    const response = new Response(null, {
      status: 101,
      headers: new Headers({
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Protocol': protocol,
      }),
    });

    const clientSocket = response.webSocket;
    if (!clientSocket) {
      return new NextResponse('WebSocket upgrade failed', { status: 500 });
    }

    clientSocket.accept();

    // Create Deepgram connection
    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
    });

    // Handle Deepgram connection events
    connection.on(LiveTranscriptionEvents.Open, () => {
      // Fetch audio stream when Deepgram connection is open
      fetch(audioUrl)
        .then(response => {
          const reader = response.body?.getReader();
          
          const readStream = () => {
            reader?.read().then(({ done, value }) => {
              if (done) {
                connection.finish();
                return;
              }
              
              if (connection.getReadyState() === WebSocket.OPEN) {
                connection.send(value);
              }
              
              readStream();
            });
          };

          readStream();
        });
    });

    // Forward transcripts to client
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          transcript: data.channel.alternatives[0].transcript
        }));
      }
    });

    // Handle cleanup
    clientSocket.addEventListener('close', () => {
      connection.finish();
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('Deepgram error:', err);
      clientSocket.close(1011, 'Deepgram error');
    });

    return response;

  } catch (error) {
    console.error('WebSocket setup error:', error);
    return NextResponse.json(
      { error: 'Failed to establish connection' },
      { status: 500 }
    );
  }
}