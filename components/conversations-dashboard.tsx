"use client"

import { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { ResultsPanel } from "@/components/results-panel"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Conversation } from "@/lib/api"

export function ConversationsDashboard() {
  // Single selection
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [isLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testScreenshot, setTestScreenshot] = useState<string | null>(null)

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      // Load selected conversation
      const savedConversation = localStorage.getItem("conversations_dashboard_selectedConversation")
      if (savedConversation) {
        try {
          const conversation = JSON.parse(savedConversation)
          setSelectedConversation(conversation)
        } catch (error) {
          console.error('Error parsing saved conversation:', error)
        }
      }
      
      // Load test result
      const savedTestResult = localStorage.getItem("conversations_dashboard_testResult")
      if (savedTestResult) {
        try {
          const result = JSON.parse(savedTestResult)
          setTestResult(result)
        } catch (error) {
          console.error('Error parsing saved test result:', error)
        }
      }
      
      // Load test screenshot
      const savedTestScreenshot = localStorage.getItem("conversations_dashboard_testScreenshot")
      if (savedTestScreenshot) {
        setTestScreenshot(savedTestScreenshot)
      }
    } catch (error) {
      console.error('Error loading conversations dashboard state:', error)
    }
  }, [])

  // Save selected conversation to localStorage whenever it changes
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem("conversations_dashboard_selectedConversation", JSON.stringify(selectedConversation))
    } else {
      localStorage.removeItem("conversations_dashboard_selectedConversation")
    }
  }, [selectedConversation])

  // Save test result to localStorage whenever it changes
  useEffect(() => {
    if (testResult) {
      localStorage.setItem("conversations_dashboard_testResult", JSON.stringify(testResult))
    } else {
      localStorage.removeItem("conversations_dashboard_testResult")
    }
  }, [testResult])

  // Save test screenshot to localStorage whenever it changes
  useEffect(() => {
    if (testScreenshot) {
      localStorage.setItem("conversations_dashboard_testScreenshot", testScreenshot)
    } else {
      localStorage.removeItem("conversations_dashboard_testScreenshot")
    }
  }, [testScreenshot])

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="heading-2">LLM Testing Dashboard</h1>
          </header>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Pass single-select handler */}
              <ConversationsDataTable onSelect={setSelectedConversation} />
            </div>
            <div className="w-96 border-l flex flex-col min-h-0 flex-shrink-0">
              {/* Pass single conversation and result setter */}
              <PromptTesterPanel
                selectedConversation={selectedConversation}
                isLoading={isLoading}
                setTestResult={setTestResult}
                setTestScreenshot={setTestScreenshot}
                onAddToQueue={async () => {}}
              />
              <Separator />
              <ResultsPanel
                testResult={testResult}
                testScreenshot={testScreenshot}
                selectedConversation={selectedConversation}
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
