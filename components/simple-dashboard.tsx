"use client"

import { useState } from "react"
import { ConversationsPanel } from "@/components/conversations-panel"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { TestResultsPanel } from "@/components/test-results-panel"

export interface Conversation {
  id: string
  timestamp: string
  audioUrl: string
  originalAnswers: Record<string, any>
  formFields: Array<{
    name: string
    type: string
    label: string
    required: boolean
  }>
  metadata: {
    duration: number
    fileSize: number
    quality: string
  }
}

export interface TestResult {
  conversationId: string
  prompt: string
  generatedAnswers: Record<string, any>
  timestamp: string
  processingTime: number
}

export function SimpleDashboard() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handlePromptTest = async (prompt: string) => {
    if (!selectedConversation) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          prompt,
        }),
      })

      if (!response.ok) throw new Error("Failed to test prompt")

      const result = await response.json()
      setTestResults((prev) => [result, ...prev])
    } catch (error) {
      console.error("Error testing prompt:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">LLM Testing Dashboard</h1>
        <p className="text-muted-foreground">Test prompts against production conversations</p>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations */}
        <div className="w-80 border-r">
          <ConversationsPanel
            onConversationSelect={setSelectedConversation}
            selectedConversation={selectedConversation}
          />
        </div>

        {/* Middle Panel - Prompt Tester (Main Feature) */}
        <div className="flex-1">
          <PromptTesterPanel
            onTest={handlePromptTest}
            selectedConversation={selectedConversation}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Test Results */}
        <div className="w-96 border-l">
          <TestResultsPanel results={testResults} selectedConversation={selectedConversation} />
        </div>
      </div>
    </div>
  )
}
