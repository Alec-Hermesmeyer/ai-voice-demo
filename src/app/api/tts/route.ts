export async function POST(req: Request) {
    try {
      console.log("Received TTS request");
  
      const { text } = await req.json();
      if (!text) {
        console.error("Error: No text provided");
        return new Response(JSON.stringify({ error: "Text is required" }), { status: 400 });
      }
  
      console.log("Sending request to Eleven Labs API...");
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY || "YOUR_11LABS_API_KEY",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      });
  
      if (!ttsResponse.ok) {
        console.error(`Eleven Labs API returned ${ttsResponse.status}: ${await ttsResponse.text()}`);
        return new Response(JSON.stringify({ error: "Failed to fetch TTS audio" }), { status: ttsResponse.status });
      }
  
      console.log("Received TTS audio from Eleven Labs");
      const audioBuffer = await ttsResponse.arrayBuffer();
  
      return new Response(Buffer.from(audioBuffer), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    } catch (error) {
      console.error("TTS API error:", error);
      return new Response(JSON.stringify({ error: "TTS failed" }), { status: 500 });
    }
  }
  