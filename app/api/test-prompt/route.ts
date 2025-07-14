import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, prompt } = await request.json()

    // Call the actual LLM service instead of returning mock data
    const llmResponse = await fetch("/api/llm/test-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        prompt,
      }),
    })

    if (!llmResponse.ok) {
      throw new Error("Failed to get LLM response")
    }

    const result = await llmResponse.json()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing prompt test:", error)
    return NextResponse.json({ error: "Failed to process prompt test" }, { status: 500 })
  }
}
