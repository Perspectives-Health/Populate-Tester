import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, prompt } = await request.json()

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Enhanced mock responses with more realistic data
    const mockResponses = [
      {
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "+1234567890",
        message: "I'm interested in learning more about your enterprise solutions and pricing tiers.",
        company: "Tech Solutions Inc",
        budget: "$25,000-$50,000",
        timeline: "Q2 2024",
        priority: "High",
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        company: "Innovation Corp",
        budget: "$50,000-$100,000",
        timeline: "Q1 2024",
        contactMethod: "Email",
        industry: "Technology",
      },
      {
        customerName: "Alice Johnson",
        issueType: "Technical Support",
        priority: "Critical",
        description: "Dashboard access issues after recent system update - multiple users affected",
        affectedSystems: ["Dashboard", "Reports", "User Management"],
        urgency: "Immediate",
      },
      {
        name: "Bob Wilson",
        email: "bob.wilson@partner.com",
        subject: "Strategic Partnership Opportunity",
        message: "Interested in discussing technology integration and joint go-to-market strategies",
        partnershipType: "Technology Integration",
        expectedRevenue: "$500,000+",
      },
      {
        name: "Sarah Chen",
        email: "sarah@startup.io",
        phone: "+1555123456",
        message: "Looking for enterprise pricing and implementation timeline for 500+ users",
        company: "StartupCo",
        userCount: "500+",
        implementationTimeline: "3 months",
      },
    ]

    // Select response based on conversation ID for consistency
    const responseIndex = Number.parseInt(conversationId.slice(-1)) % mockResponses.length
    const selectedResponse = mockResponses[responseIndex] || mockResponses[0]

    const mockResponse = {
      conversationId,
      prompt,
      generatedAnswers: selectedResponse,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(1000 + Math.random() * 2000),
    }

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error("Error processing prompt test:", error)
    return NextResponse.json({ error: "Failed to process prompt test" }, { status: 500 })
  }
}
