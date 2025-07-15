"use client"

import { useState } from "react"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { AdvancedResultsPanel } from "@/components/advanced-results-panel"

import { Conversation } from "@/lib/api"

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



  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <h1 className="heading-1-neon">LLM Testing Dashboard</h1>
        <p className="text-slate-400">Advanced prompt testing with production conversations</p>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations Data Table */}
        <div className="w-1/2 border-r border-slate-800">
          <ConversationsDataTable
            onSelect={(conversation) => setSelectedConversations(conversation ? [conversation] : [])}
          />
        </div>

        {/* Middle Panel - Prompt Tester */}
        <div className="w-1/3 border-r border-slate-800">
          <PromptTesterPanel
            selectedConversation={selectedConversations[0] || null}
            isLoading={isLoading}
            setTestResult={(result) => setTestResults((prev) => [result, ...prev])}
            setTestScreenshot={() => {}}
          />
        </div>

        {/* Right Panel - Advanced Results */}
        <div className="w-1/3">
          <AdvancedResultsPanel 
            results={testResults} 
            selectedConversation={selectedConversations[0] || null}
            onClear={() => setTestResults([])}
            isPending={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
