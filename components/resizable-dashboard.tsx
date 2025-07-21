"use client"

import React, { useState, useRef, useEffect } from "react"
import { ConversationsDataTable } from "@/components/conversations-data-table"
import { PromptTesterPanel } from "@/components/prompt-tester-panel"
import { TestQueuePanel } from "@/components/test-queue-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TestJob, Conversation, apiService } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

export function ResizableDashboard() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("conversations")
  const [promptInput, setPromptInput] = useState("")
  const [promptData, setPromptData] = useState("")
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [includeScreenshot, setIncludeScreenshot] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testJobs, setTestJobs] = useState<TestJob[]>([])
  const queuePanelRef = useRef<any>(null)

  const handleAddToQueue = async (jobData: any) => {
    console.log('handleAddToQueue called with jobData:', jobData)
    
    // Create a new job entry
    const newJob: TestJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: jobData.conversation_id,
      workflow_id: jobData.workflow_id,
      center_name: jobData.center_name,
      workflow_name: jobData.workflow_name,
      prompt: jobData.prompt,
      status: 'pending',
      timestamp: new Date().toISOString(),
      screenshot_s3_link: jobData.screenshot_s3_link
    }
    
    console.log('Created new job:', newJob)
    
    // Add to local state
    setTestJobs(prev => [...prev, newJob])
    
    // Also add to TestQueuePanel if it's available
    if (queuePanelRef.current) {
      console.log('Calling queuePanelRef.current.addToQueue')
      await queuePanelRef.current.addToQueue(jobData)
      console.log('queuePanelRef.current.addToQueue completed')
    } else {
      console.log('queuePanelRef.current is null')
    }
  }

  const setTestResult = () => {}
  const setTestScreenshot = () => {}

  // Load prompt data when conversation changes
  useEffect(() => {
    console.log('Conversation changed:', selectedConversation)
    if (selectedConversation) {
      console.log('Loading prompt data for conversation:', selectedConversation.id)
      loadPromptData()
    }
  }, [selectedConversation])

  const loadPromptData = async () => {
    if (!selectedConversation) return
    
    try {
      console.log('Starting to load prompt data...')
      setLoadingPrompt(true)
      const response = await apiService.getPrompt(selectedConversation.id, selectedConversation.workflow_id)
      console.log('Prompt data loaded:', response)
      setPromptInput(response.default_prompt)
      setPromptData(response.data)
    } catch (error) {
      console.error('Error loading prompt data:', error)
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleTest = async () => {
    console.log('handleTest called')
    if (!promptInput.trim() || !selectedConversation) {
      console.log('handleTest early return - promptInput:', promptInput.trim(), 'selectedConversation:', selectedConversation)
      return
    }

    try {
      console.log('Setting testLoading to true')
      setTestLoading(true)

      // Create a new test job
      const newJob = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        workflow_id: selectedConversation.workflow_id,
        center_name: selectedConversation.center_name,
        workflow_name: selectedConversation.workflow_name,
        prompt: promptInput,
        status: 'pending' as const,
        timestamp: new Date().toISOString(),
        screenshot_s3_link: selectedConversation.mapping_screenshot_s3_link,
        include_screenshot: !!selectedConversation.mapping_screenshot_s3_link && includeScreenshot
      }

      console.log('Created newJob:', newJob)
      console.log('queuePanelRef.current:', queuePanelRef.current)

      // Add test to queue
      await handleAddToQueue(newJob)
      console.log('handleAddToQueue completed')

    } catch (err) {
      console.error('Error adding test to queue:', err)
    } finally {
      console.log('Setting testLoading to false')
      setTestLoading(false)
    }
  }

  const handleClear = () => {
    setPromptInput("")
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header and Tabs in the same row */}
      <div className="border-b border-slate-800 px-6 py-4 neon-accent flex items-center justify-between bg-slate-950">
        <div>
          <h1 className="heading-1-neon">LLM Testing Dashboard</h1>
          <p className="text-slate-400">Advanced prompt testing with production conversations</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="flex gap-4 bg-slate-900 px-2 py-1">
            <TabsTrigger value="conversations" className="data-[state=active]:bg-slate-800 px-6 py-3 text-base font-medium">
              Conversations
            </TabsTrigger>
            <TabsTrigger value="testing" className="data-[state=active]:bg-slate-800 px-6 py-3 text-base font-medium">
              Testing
            </TabsTrigger>
            <TabsTrigger value="test-queue" className="data-[state=active]:bg-slate-800 px-6 py-3 text-base font-medium">
              Test Queue
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabbed Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            {/* Conversations Tab */}
            <TabsContent value="conversations" className="h-full m-0">
              <div className="h-full p-6">
                <ConversationsDataTable
                  onSelect={setSelectedConversation}
                  onConversationsLoad={setConversations}
                />
              </div>
            </TabsContent>

            {/* Testing Tab */}
            <TabsContent value="testing" className="h-full m-0">
              <div className="h-full p-6">
                {selectedConversation ? (
                  <ResizablePanelGroup direction="horizontal" className="h-full">
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <Card className="h-full">
                        <CardContent className="p-4 h-full">
                          <div className="flex flex-col h-full">
                            <div className="flex items-center mb-1">
                              <label className="heading-3-neon mr-2">Prompt Instructions</label>
                              {/* Screenshot toggle, only if screenshot is available */}
                              {selectedConversation?.mapping_screenshot_s3_link && (
                                <div className="flex items-center ml-4">
                                  <Switch
                                    id="include-screenshot-toggle"
                                    checked={includeScreenshot}
                                    onCheckedChange={setIncludeScreenshot}
                                    className="mr-2"
                                  />
                                  <label htmlFor="include-screenshot-toggle" className="text-xs text-slate-400 select-none">
                                    Include screenshot in LLM prompt
                                  </label>
                                </div>
                              )}
                            </div>
                            <Textarea
                              placeholder={loadingPrompt ? "Loading prompt..." : "Select a conversation to see the prompt"}
                              value={promptInput}
                              onChange={(e) => setPromptInput(e.target.value)}
                              className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 text-base mb-4 custom-scrollbar"
                              style={{ height: "100%" }}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={handleTest}
                                disabled={!promptInput.trim() || !selectedConversation || loadingPrompt}
                                className="flex-1 h-12 text-lg neon-glow bg-emerald-600 hover:bg-emerald-700"
                                size="lg"
                              >
                                {testLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                                    Adding to Queue...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-5 w-5 mr-3" />
                                    Test Prompt
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={handleClear}
                                disabled={!promptInput.trim()}
                                variant="outline"
                                className="h-12 px-4 text-lg"
                                size="lg"
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <Card className="h-full">
                        <CardContent className="p-4 h-full">
                          <div className="flex flex-col h-full">
                            <label className="heading-3-neon mb-1">Prompt Data (Mapping + Transcript)</label>
                            <Textarea
                              placeholder={loadingPrompt ? "Loading data..." : "Select a conversation to see the data"}
                              value={promptData}
                              onChange={(e) => setPromptData(e.target.value)}
                              className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 text-base custom-scrollbar"
                              style={{ height: "100%" }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2">No Conversation Selected</h3>
                      <p className="text-slate-400">Please select a conversation from the Conversations tab to start testing.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Test Queue Tab */}
            <TabsContent value="test-queue" className="h-full m-0">
              <div className="h-full p-6">
                <TestQueuePanel
                  selectedConversation={selectedConversation}
                  onAddToQueue={handleAddToQueue}
                  conversations={conversations}
                  ref={queuePanelRef}
                  testJobs={testJobs}
                  setTestJobs={setTestJobs}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
