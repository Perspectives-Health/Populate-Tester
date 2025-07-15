"use client"

import { useState, useEffect } from "react"
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

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      // Load selected conversations
      const savedConversations = localStorage.getItem("advanced_dashboard_selectedConversations")
      if (savedConversations) {
        try {
          const conversations = JSON.parse(savedConversations)
          setSelectedConversations(conversations)
        } catch (error) {
          console.error('Error parsing saved conversations:', error)
        }
      }
      
      // Load test results
      const savedTestResults = localStorage.getItem("advanced_dashboard_testResults")
      if (savedTestResults) {
        try {
          const results = JSON.parse(savedTestResults)
          setTestResults(results)
        } catch (error) {
          console.error('Error parsing saved test results:', error)
        }
      }
    } catch (error) {
      console.error('Error loading advanced dashboard state:', error)
    }
  }, [])

  // Save selected conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("advanced_dashboard_selectedConversations", JSON.stringify(selectedConversations))
  }, [selectedConversations])

  // Save test results to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("advanced_dashboard_testResults", JSON.stringify(testResults))
  }, [testResults])

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
            onAddToQueue={async () => {}}
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
