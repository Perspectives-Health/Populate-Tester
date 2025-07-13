"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ConversationsTable } from "@/components/conversations-table"
import { PromptTester } from "@/components/prompt-tester"
import { ResultsPanel } from "@/components/results-panel"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

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

export function ConversationsDashboard() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handlePromptTest = async (prompt: string, conversationIds: string[]) => {
    setIsLoading(true)

    try {
      // Simulate API call to test prompt against selected conversations
      const results = await Promise.all(
        conversationIds.map(async (id) => {
          // This would be your actual API call to process the audio with the new prompt
          const response = await fetch("/api/test-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: id, prompt }),
          })

          if (!response.ok) throw new Error("Failed to test prompt")

          return await response.json()
        }),
      )

      setTestResults((prev) => [...prev, ...results])
    } catch (error) {
      console.error("Error testing prompt:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">LLM Testing Dashboard</h1>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col">
              <ConversationsTable
                onConversationSelect={setSelectedConversation}
                selectedConversation={selectedConversation}
              />
            </div>

            <div className="w-96 border-l flex flex-col">
              <PromptTester
                onTest={handlePromptTest}
                selectedConversation={selectedConversation}
                isLoading={isLoading}
              />

              <Separator />

              <ResultsPanel results={testResults} selectedConversation={selectedConversation} />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
