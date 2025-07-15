"use client"

import React, { useState, useRef, useEffect } from "react"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { TestQueuePanel } from "@/components/test-queue-panel"
import type { Conversation } from "@/lib/api"
import { startTestPromptJob } from "@/lib/api"

export function ResizableDashboard() {
  // Single-select logic with localStorage persistence
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Panel width states (as percentages) with localStorage persistence
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [middlePanelWidth, setMiddlePanelWidth] = useState(30)
  const [rightPanelWidth, setRightPanelWidth] = useState(30)
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null)

  // Ref to the queue panel
  const queuePanelRef = useRef<{ addToQueue: (jobData: any) => Promise<void> } | null>(null)

  // Load dashboard state from localStorage on mount
  useEffect(() => {
    try {
      // Load panel widths
      const savedLeftWidth = localStorage.getItem("dashboard_leftPanelWidth")
      const savedMiddleWidth = localStorage.getItem("dashboard_middlePanelWidth")
      const savedRightWidth = localStorage.getItem("dashboard_rightPanelWidth")
      
      if (savedLeftWidth && savedMiddleWidth && savedRightWidth) {
        setLeftPanelWidth(parseFloat(savedLeftWidth))
        setMiddlePanelWidth(parseFloat(savedMiddleWidth))
        setRightPanelWidth(parseFloat(savedRightWidth))
      }
      
      // Load selected conversation
      const savedConversation = localStorage.getItem("dashboard_selectedConversation")
      if (savedConversation) {
        try {
          const conversation = JSON.parse(savedConversation)
          setSelectedConversation(conversation)
        } catch (error) {
          console.error('Error parsing saved conversation:', error)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard state:', error)
    }
  }, [])

  // Save panel widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("dashboard_leftPanelWidth", leftPanelWidth.toString())
    localStorage.setItem("dashboard_middlePanelWidth", middlePanelWidth.toString())
    localStorage.setItem("dashboard_rightPanelWidth", rightPanelWidth.toString())
  }, [leftPanelWidth, middlePanelWidth, rightPanelWidth])

  // Save selected conversation to localStorage whenever it changes
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem("dashboard_selectedConversation", JSON.stringify(selectedConversation))
    } else {
      localStorage.removeItem("dashboard_selectedConversation")
    }
  }, [selectedConversation])

  // Handle adding test to queue
  const handleAddToQueue = async (jobData: any) => {
    console.log('Test queued:', jobData)
    console.log('Queue panel ref at time of call:', queuePanelRef.current)
    // Call the queue panel's function directly
    if (queuePanelRef.current) {
      console.log('Calling queue panel addToQueue function')
      await queuePanelRef.current.addToQueue(jobData)
    } else {
      console.log('Queue panel ref is null')
    }
  }

  // Debug: Check when ref becomes available
  useEffect(() => {
    console.log('Queue panel ref:', queuePanelRef.current)
  }, [queuePanelRef.current])

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
      const newLeftWidth = Math.max(15, Math.min(60, mousePercentage))
      const remainingWidth = 100 - newLeftWidth
      // Keep proportions for the other panels
      const newMiddleWidth = (middlePanelWidth / (middlePanelWidth + rightPanelWidth)) * remainingWidth
      const newRightWidth = remainingWidth - newMiddleWidth
      setLeftPanelWidth(newLeftWidth)
      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
    } else if (isDragging === "right") {
      // Adjust middle and right panels
      const leftBoundary = leftPanelWidth
      const rightBoundary = 100
      const adjustedMousePercentage = Math.max(leftBoundary + 10, Math.min(rightBoundary - 10, mousePercentage))
      const newMiddleWidth = adjustedMousePercentage - leftPanelWidth
      const newRightWidth = 100 - leftPanelWidth - newMiddleWidth
      setMiddlePanelWidth(newMiddleWidth)
      setRightPanelWidth(newRightWidth)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      // Cleanup if needed
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <h1 className="heading-1-neon">LLM Testing Dashboard</h1>
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
        <div className="overflow-hidden flex-shrink-0" style={{ width: `${leftPanelWidth}%` }}>
          <ConversationsDataTable
            onSelect={setSelectedConversation}
            onConversationsLoad={setConversations}
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
        <div className="overflow-hidden flex-shrink-0" style={{ width: `${middlePanelWidth}%` }}>
          <PromptTesterPanel
            selectedConversation={selectedConversation}
            isLoading={isLoading}
            setTestResult={() => {}}
            setTestScreenshot={() => {}}
            onAddToQueue={handleAddToQueue}
          />
        </div>
        {/* Right Divider */}
        <div
          className={`w-1 bg-slate-800 hover:bg-emerald-400/50 cursor-col-resize transition-colors relative group flex-shrink-0 ${
            isDragging === "right" ? "bg-emerald-400" : ""
          }`}
          onMouseDown={() => handleMouseDown("right")}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-emerald-400/20" />
        </div>
        {/* Right Panel - Test Queue */}
        <div className="overflow-hidden flex-shrink-0" style={{ width: `${rightPanelWidth}%` }}>
          <TestQueuePanel
            selectedConversation={selectedConversation}
            onAddToQueue={handleAddToQueue}
            conversations={conversations}
            ref={queuePanelRef}
          />
        </div>
      </div>
    </div>
  )
}
