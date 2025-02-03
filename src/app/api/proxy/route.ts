import { NextResponse } from "next/server";

const BASE_URL = "https://bg-backend-app1.azurewebsites.net/api/v1/query/";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.message) {
      return NextResponse.json({ error: "Missing 'message' field" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 9 seconds

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: body.message,
        history: body.history || [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(
      { response: data.answer || data.response || "No response" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );

  } catch (error) {
    const isTimeout = (error as Error).name === 'AbortError';
    return NextResponse.json(
      {
        error: isTimeout ? "Request timed out" : "Backend communication failed",
        response: isTimeout ? "Server response timed out. Please try again." 
                            : "Unable to connect to the server.",
      },
      {
        status: isTimeout ? 504 : 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}