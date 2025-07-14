"use client"

import React, { useState, useRef } from "react"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { AdvancedResultsPanel } from "@/components/advanced-results-panel"
import type { Conversation } from "@/lib/api"
import { ScreenshotPanel } from "@/components/ScreenshotPanel";
import { startTestPromptJob, getTestPromptResult, clearTestPromptResults } from "@/lib/api"

export function ResizableDashboard() {
  // Single-select logic
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Panel width states (as percentages)
  const [leftPanelWidth, setLeftPanelWidth] = useState(30)
  const [middlePanelWidth, setMiddlePanelWidth] = useState(25)
  const [rightPanelWidth, setRightPanelWidth] = useState(22.5)
  const [rightPanel2Width, setRightPanel2Width] = useState(22.5)
  const [isDragging, setIsDragging] = useState<"left" | "right" | "right2" | null>(null)

  // Handle async test prompt job
  const handlePromptTest = async (payload: any) => {
    setIsPending(true)
    // Start the job
    const { job_id } = await startTestPromptJob(payload)
    // Poll for result
    pollingRef.current = setInterval(async () => {
      const res = await getTestPromptResult(job_id)
      if (res.status === 'done' || res.status === 'error') {
        setTestResults((prev) => [res, ...prev])
        setIsPending(false)
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }, 5000)
  }

  const handleClearResults = async () => {
    await clearTestPromptResults()
    setTestResults([])
    setIsPending(false)
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  const handleMouseDown = (divider: "left" | "right" | "right2") => {
    setIsDragging(divider)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const containerRect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const containerWidth = containerRect.width
    const mousePercentage = (mouseX / containerWidth) * 100
    if (isDragging === "left") {
      const newLeftWidth = Math.max(15, Math.min(60, mousePercentage))
      const remainingWidth = 100 - newLeftWidth
      // Keep proportions for the other panels
      const totalRight = middlePanelWidth + rightPanelWidth + rightPanel2Width
      const newMiddleWidth = (middlePanelWidth / totalRight) * remainingWidth
      const newRightWidth = (rightPanelWidth / totalRight) * remainingWidth
      const newRight2Width = remainingWidth - newMiddleWidth - newRightWidth
      setLeftPanelWidth(newLeftWidth)
      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
      setRightPanel2Width(newRight2Width)
    } else if (isDragging === "right") {
      // Adjust middle and right panels
      const leftBoundary = leftPanelWidth
      const rightBoundary = leftPanelWidth + middlePanelWidth + rightPanelWidth
      const adjustedMousePercentage = Math.max(leftBoundary + 10, Math.min(rightBoundary - 10, mousePercentage))
      const newMiddleWidth = adjustedMousePercentage - leftPanelWidth
      const remainingWidth = 100 - leftPanelWidth - newMiddleWidth
      const totalRight = rightPanelWidth + rightPanel2Width
      const newRightWidth = (rightPanelWidth / totalRight) * remainingWidth
      const newRight2Width = remainingWidth - newRightWidth
      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
      setRightPanel2Width(newRight2Width)
    } else if (isDragging === "right2") {
      // Adjust right and right2 panels
      const leftBoundary = leftPanelWidth + middlePanelWidth
      const rightBoundary = 100
      const adjustedMousePercentage = Math.max(leftBoundary + rightPanelWidth * 0.2, Math.min(rightBoundary - 10, mousePercentage))
      const newRightWidth = adjustedMousePercentage - leftBoundary
      const newRight2Width = 100 - leftPanelWidth - middlePanelWidth - newRightWidth
      setRightPanelWidth(newRightWidth)
      setRightPanel2Width(newRight2Width)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Clean up polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <h1 className="text-2xl font-bold neon-text">LLM Testing Dashboard</h1>
        <p className="text-slate-400">Advanced prompt testing with production conversations</p>
      </header>
      {/* Resizable Four Panel Layout */}
      <div
        className="flex-1 flex overflow-hidden relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left Panel - Conversations Data Table */}
        <div className="overflow-hidden" style={{ width: `${leftPanelWidth}%` }}>
          <ConversationsDataTable
            onSelect={setSelectedConversation}
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
            selectedConversation={selectedConversation}
            isLoading={isLoading}
            setTestResult={handlePromptTest}
            setTestScreenshot={() => {}}
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
          <AdvancedResultsPanel
            results={testResults}
            selectedConversation={selectedConversation}
            onClear={handleClearResults}
            isPending={isPending}
          />
        </div>
        {/* Right2 Divider */}
        <div
          className={`w-1 bg-slate-800 hover:bg-emerald-400/50 cursor-col-resize transition-colors relative group ${
            isDragging === "right2" ? "bg-emerald-400" : ""
          }`}
          onMouseDown={() => handleMouseDown("right2")}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-emerald-400/20" />
        </div>
        {/* New Fourth Panel - Screenshot */}
        <div className="overflow-hidden" style={{ width: `${rightPanel2Width}%`, height: '100%' }}>
          <ScreenshotPanel screenshotUrl={selectedConversation?.mapping_screenshot_s3_link} />
        </div>
      </div>
    </div>
  )
}
