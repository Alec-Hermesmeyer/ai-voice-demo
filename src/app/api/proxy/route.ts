import { NextResponse } from "next/server"

const BASE_URL = "https://bg-backend-app1.azurewebsites.net/api/v1/query/"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Ensure a valid request format
    if (!body.message) {
      console.error("Proxy Error: Missing 'message' in request body:", body)
      return NextResponse.json({ error: "Missing required 'message' field" }, { status: 400 })
    }

    // Build the correct backend URL
    const backendUrl = BASE_URL

    console.log("Forwarding request to:", backendUrl, "with body:", body)

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Forwarded-Proto": "https", // Force HTTPS in headers
      },
      body: JSON.stringify({
        query: body.message,  // ✅ Keep "message"
        history: body.history || [], // ✅ Ensure history is always an array
      }),
    })

    // Log response status
    console.log("Backend status:", response.status)
    const responseText = await response.text()
    console.log("Backend raw response:", responseText)

    if (!response.ok) {
      console.error("Backend error:", response.status, response.statusText)
      throw new Error(`Backend responded with status ${response.status}`)
    }

    // Parse backend response safely
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError, responseText);
      return NextResponse.json({
        error: "Invalid response from backend",
        response: "The server returned an unreadable response.",
      }, { status: 500 })
    }

    console.log("Parsed backend response:", data)

    return NextResponse.json({
      response: data.answer || data.response || "No valid response received.",
    })

  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json({
      error: "Failed to communicate with backend",
      response: "Unable to connect to the server. Please try again.",
    }, { status: 500 })
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
  })
}
