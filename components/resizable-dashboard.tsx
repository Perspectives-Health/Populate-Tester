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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'

export function ResizableDashboard() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("conversations")
  const [promptInput, setPromptInput] = useState("")
  const [promptData, setPromptData] = useState("")
  const [mapping, setMapping] = useState("")
  const [transcript, setTranscript] = useState("")
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [includeScreenshot, setIncludeScreenshot] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testJobs, setTestJobs] = useState<TestJob[]>([])
  const [editDataMode, setEditDataMode] = useState(false)
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
      screenshot_s3_link: jobData.screenshot_s3_link,
      include_screenshot: jobData.include_screenshot,
      custom_mapping: jobData.custom_mapping
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

  // Debug: Log when promptData changes
  useEffect(() => {
    console.log('📝📝📝 promptData CHANGED:', promptData)
  }, [promptData])

  // Debug: Log when mapping changes
  useEffect(() => {
    console.log('🗺️🗺️🗺️ mapping CHANGED:', mapping)
  }, [mapping])

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
    
    console.log('Loading prompt data for conversation:', selectedConversation.id)
    setLoadingPrompt(true)
    
    try {
      console.log('Starting to load prompt data...')
      const promptResponse = await apiService.getPrompt(selectedConversation.id, selectedConversation.workflow_id)
      console.log('Prompt data loaded:', promptResponse)
      
      // Set the default prompt
      setPromptInput(promptResponse.default_prompt)
      
      // Separate mapping and transcript
      setMapping(JSON.stringify(promptResponse.mapping, null, 2))
      setTranscript(promptResponse.transcript)
      
      // Keep the full prompt data for backward compatibility
      setPromptData(JSON.stringify({
        data: promptResponse.data,
        mapping: promptResponse.mapping,
        transcript: promptResponse.transcript
      }, null, 2))
      
    } catch (error) {
      console.error('Error loading prompt data:', error)
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleTest = async () => {
    console.log('🚀🚀🚀 handleTest FUNCTION CALLED 🚀🚀🚀')
    console.log('=== handleTest called ===')
    console.log('promptInput:', promptInput)
    console.log('promptData:', promptData)
    console.log('mapping:', mapping)
    console.log('transcript:', transcript)
    console.log('promptInput length:', promptInput?.length)
    console.log('promptData length:', promptData?.length)
    console.log('mapping length:', mapping?.length)
    console.log('transcript length:', transcript?.length)
    console.log('promptInput trimmed:', promptInput?.trim())
    console.log('mapping trimmed:', mapping?.trim())
    console.log('selectedConversation:', selectedConversation)
    
    if (!promptInput.trim() || !selectedConversation) {
      console.log('handleTest early return - promptInput:', promptInput.trim(), 'selectedConversation:', selectedConversation)
      return
    }

    try {
      console.log('Setting testLoading to true')
      setTestLoading(true)

      // Create a new test job with the current edited values
      const newJob = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        workflow_id: selectedConversation.workflow_id,
        center_name: selectedConversation.center_name,
        workflow_name: selectedConversation.workflow_name,
        prompt: promptInput, // Use the current edited prompt
        status: 'pending' as const,
        timestamp: new Date().toISOString(),
        screenshot_s3_link: selectedConversation.mapping_screenshot_s3_link,
        include_screenshot: !!selectedConversation.mapping_screenshot_s3_link && includeScreenshot,
        // Include the edited mapping data as custom_mapping (parse string to object)
        custom_mapping: mapping ? JSON.parse(mapping) : undefined
      }

      console.log('=== Created newJob ===')
      console.log('newJob.prompt:', newJob.prompt)
      console.log('newJob.custom_mapping:', newJob.custom_mapping)
      console.log('newJob.include_screenshot:', newJob.include_screenshot)
      console.log('Full newJob object:', newJob)
      console.log('queuePanelRef.current:', queuePanelRef.current)
      
      // Debug: Log the exact values being used
      console.log('🔍 DEBUG VALUES:')
      console.log('  promptInput:', promptInput)
      console.log('  mapping:', mapping)
      console.log('  mapping length:', mapping?.length)
      console.log('  mapping trimmed:', mapping?.trim())
      console.log('  includeScreenshot state:', includeScreenshot)
      console.log('  selectedConversation.mapping_screenshot_s3_link:', selectedConversation.mapping_screenshot_s3_link)

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
                    {/* Left Panel - Prompt Instructions */}
                    <ResizablePanel defaultSize={33} minSize={25}>
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
                    
                    {/* Middle Panel - Mapping (Editable) */}
                    <ResizablePanel defaultSize={33} minSize={25}>
                      <Card className="h-full">
                        <CardContent className="p-4 h-full">
                          <div className="flex flex-col h-full">
                            <label className="heading-3-neon mb-1 flex items-center justify-between">
                              Mapping (Editable)
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2 px-2 py-1 text-xs"
                                onClick={() => setEditDataMode((v) => !v)}
                              >
                                {editDataMode ? 'Done' : 'Edit'}
                              </Button>
                            </label>
                            {editDataMode ? (
                              <Textarea
                                placeholder={loadingPrompt ? "Loading mapping..." : "Select a conversation to see the mapping"}
                                value={mapping}
                                onChange={(e) => {
                                  console.log('📝 MAPPING EDIT:', e.target.value)
                                  setMapping(e.target.value)
                                }}
                                className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 text-base custom-scrollbar font-mono"
                                style={{ height: "100%" }}
                              />
                            ) : (
                              <div className="flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900/50 p-4 custom-scrollbar">
                                {mapping ? (
                                  <SyntaxHighlighter
                                    language="json"
                                    style={vscDarkPlus}
                                    customStyle={{
                                      background: 'transparent',
                                      margin: 0,
                                      padding: 0,
                                      fontSize: '14px',
                                      lineHeight: '1.5',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'break-word'
                                    }}
                                    wrapLines={true}
                                    lineProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }}
                                  >
                                    {mapping}
                                  </SyntaxHighlighter>
                                ) : (
                                  <div className="text-slate-400 text-sm">
                                    {loadingPrompt ? "Loading mapping..." : "Select a conversation to see the mapping"}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </ResizablePanel>
                    
                    <ResizableHandle />
                    
                    {/* Right Panel - Transcript (Read-only) */}
                    <ResizablePanel defaultSize={34} minSize={25}>
                      <Card className="h-full">
                        <CardContent className="p-4 h-full">
                          <div className="flex flex-col h-full">
                            <label className="heading-3-neon mb-1">
                              Transcript (Read-only)
                            </label>
                            <div className="flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900/50 p-4 custom-scrollbar">
                              {transcript ? (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {transcript}
                                </div>
                              ) : (
                                <div className="text-slate-400 text-sm">
                                  {loadingPrompt ? "Loading transcript..." : "Select a conversation to see the transcript"}
                                </div>
                              )}
                            </div>
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
