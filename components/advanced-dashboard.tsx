"use client"

import { useState } from "react"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { AdvancedResultsPanel } from "@/components/advanced-results-panel"

export interface Conversation {
  id: string
  name: string
  workflow: string
  email: string
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
    tags: string[]
  }
}

export interface TestResult {
  conversationId: string
  prompt: string
  generatedAnswers: Record<string, any>
  timestamp: string
  processingTime: number
  accuracy: number
}

export function AdvancedDashboard() {
  const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handlePromptTest = async (prompt: string) => {
    if (selectedConversations.length === 0) return

    setIsLoading(true)

    try {
      const results = await Promise.all(
        selectedConversations.map(async (conversation) => {
          const response = await fetch("/api/test-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: conversation.id,
              prompt,
            }),
          })

          if (!response.ok) throw new Error("Failed to test prompt")
          return await response.json()
        }),
      )

      setTestResults((prev) => [...results, ...prev])
    } catch (error) {
      console.error("Error testing prompt:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <h1 className="text-2xl font-bold neon-text">LLM Testing Dashboard</h1>
        <p className="text-slate-400">Advanced prompt testing with production conversations</p>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations Data Table */}
        <div className="w-1/2 border-r border-slate-800">
          <ConversationsDataTable
            onSelectionChange={setSelectedConversations}
            selectedConversations={selectedConversations}
          />
        </div>

        {/* Middle Panel - Prompt Tester */}
        <div className="w-1/3 border-r border-slate-800">
          <PromptTesterPanel
            onTest={handlePromptTest}
            selectedConversations={selectedConversations}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Advanced Results */}
        <div className="w-1/3">
          <AdvancedResultsPanel results={testResults} selectedConversations={selectedConversations} />
        </div>
      </div>
    </div>
  )
}
