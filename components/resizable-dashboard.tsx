"use client"

import type React from "react"

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

export function ResizableDashboard() {
  const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Panel width states (as percentages)
  const [leftPanelWidth, setLeftPanelWidth] = useState(45)
  const [middlePanelWidth, setMiddlePanelWidth] = useState(30)
  const [rightPanelWidth, setRightPanelWidth] = useState(25)

  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null)

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

  const handleMouseDown = (divider: "left" | "right") => {
    setIsDragging(divider)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const containerRect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const containerWidth = containerRect.width
    const mousePercentage = (mouseX / containerWidth) * 100

    if (isDragging === "left") {
      // Adjust left and middle panels
      const newLeftWidth = Math.max(20, Math.min(60, mousePercentage))
      const remainingWidth = 100 - newLeftWidth
      const newMiddleWidth = Math.max(
        20,
        Math.min(50, (middlePanelWidth / (middlePanelWidth + rightPanelWidth)) * remainingWidth),
      )
      const newRightWidth = remainingWidth - newMiddleWidth

      setLeftPanelWidth(newLeftWidth)
      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
    } else if (isDragging === "right") {
      // Adjust middle and right panels
      const rightBoundary = leftPanelWidth + middlePanelWidth + rightPanelWidth
      const leftBoundary = leftPanelWidth
      const adjustedMousePercentage = Math.max(leftBoundary + 20, Math.min(rightBoundary - 20, mousePercentage))

      const newMiddleWidth = adjustedMousePercentage - leftPanelWidth
      const newRightWidth = 100 - leftPanelWidth - newMiddleWidth

      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <h1 className="text-2xl font-bold neon-text">LLM Testing Dashboard</h1>
        <p className="text-slate-400">Advanced prompt testing with production conversations</p>
      </header>

      {/* Resizable Three Panel Layout */}
      <div
        className="flex-1 flex overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left Panel - Conversations Data Table */}
        <div className="overflow-hidden" style={{ width: `${leftPanelWidth}%` }}>
          <ConversationsDataTable
            onSelectionChange={setSelectedConversations}
            selectedConversations={selectedConversations}
          />
        </div>

        {/* Left Divider */}
        <div
          className={`w-1 bg-slate-800 hover:bg-emerald-400/50 cursor-col-resize transition-colors relative group ${
            isDragging === "left" ? "bg-emerald-400" : ""
          }`}
          onMouseDown={() => handleMouseDown("left")}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-emerald-400/20" />
        </div>

        {/* Middle Panel - Prompt Tester */}
        <div className="overflow-hidden" style={{ width: `${middlePanelWidth}%` }}>
          <PromptTesterPanel
            onTest={handlePromptTest}
            selectedConversations={selectedConversations}
            isLoading={isLoading}
          />
        </div>

        {/* Right Divider */}
        <div
          className={`w-1 bg-slate-800 hover:bg-emerald-400/50 cursor-col-resize transition-colors relative group ${
            isDragging === "right" ? "bg-emerald-400" : ""
          }`}
          onMouseDown={() => handleMouseDown("right")}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-emerald-400/20" />
        </div>

        {/* Right Panel - Advanced Results */}
        <div className="overflow-hidden" style={{ width: `${rightPanelWidth}%` }}>
          <AdvancedResultsPanel results={testResults} selectedConversations={selectedConversations} />
        </div>
      </div>
    </div>
  )
}
