"use client"

import { useState } from "react"
import { ConversationsPanel } from "@/components/conversations-panel"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { TestResultsPanel } from "@/components/test-results-panel"
import { Conversation } from "@/lib/api"

export interface TestResult {
  conversationId: string
  prompt: string
  generatedAnswers: Record<string, any>
  timestamp: string
  processingTime: number
}

// Helper function to check if a result is empty or meaningless
const isEmptyResult = (result: any): boolean => {
  if (!result) return true
  
  // Check if result has meaningful content
  const json = result?.result || result?.text || result || {}
  
  // If it's a string, check if it's empty or just whitespace
  if (typeof json === 'string') {
    const cleaned = json.trim()
    if (!cleaned || cleaned === '{}' || cleaned === '[]' || cleaned === 'null') {
      return true
    }
  }
  
  // If it's an object, check if it's empty or has only empty values
  if (typeof json === 'object' && json !== null) {
    const keys = Object.keys(json)
    if (keys.length === 0) return true
    
    // Check if all values are empty
    const hasNonEmptyValue = keys.some(key => {
      const value = json[key]
      if (value === null || value === undefined || value === '') return false
      if (typeof value === 'string' && value.trim() === '') return false
      if (typeof value === 'object' && Object.keys(value).length === 0) return false
      return true
    })
    
    if (!hasNonEmptyValue) return true
  }
  
  return false
}

export function SimpleDashboard() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSetTestResult = (result: any) => {
    // Only add non-empty results
    if (!isEmptyResult(result)) {
      setTestResults((prev) => [result, ...prev])
    } else {
      console.log('Skipping empty result:', result)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <h1 className="heading-1">LLM Testing Dashboard</h1>
        <p className="text-muted-foreground">Test prompts against production conversations</p>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversations */}
        <div className="w-80 border-r">
          <ConversationsPanel
            onSelectionChange={(conversations) => setSelectedConversation(conversations[0] || null)}
            selectedConversations={selectedConversation ? [selectedConversation] : []}
          />
        </div>

        {/* Middle Panel - Prompt Tester (Main Feature) */}
        <div className="flex-1">
          <PromptTesterPanel
            selectedConversation={selectedConversation}
            isLoading={isLoading}
            setTestResult={handleSetTestResult}
            setTestScreenshot={() => {}}
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
