import { NextResponse } from "next/server";

const BASE_URL = "https://bg-backend-app1.azurewebsites.net/api/v1/property_graph/query/";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ensure a valid request format
    if (!body.message) {
      console.error("Proxy Error: Missing 'message' in request body:", body);
      return NextResponse.json({ error: "Missing required 'message' field" }, { status: 400 });
    }

    // Open a connection to the backend API
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query: body.message,  // ✅ Keep "message"
        history: body.history || [], // ✅ Ensure history is always an array
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    // **🚀 Streaming Response**
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return;

        // Read data chunks from backend and stream them
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value); // Push the data to the stream
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({
      error: "Failed to communicate with backend",
      response: "Unable to connect to the server. Please try again.",
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}
