"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Zap, Save, RefreshCw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiService, Conversation } from "@/lib/api"
import { startTestPromptJob, getTestPromptResult } from "@/lib/api"
import { Switch } from "@/components/ui/switch"

interface PromptTesterPanelProps {
  selectedConversation: Conversation | null
  isLoading: boolean
  setTestResult: (result: any) => void
  setTestScreenshot: (url: string | null) => void
  onAddToQueue: (jobData: any) => Promise<void>
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

export function PromptTesterPanel({ selectedConversation, isLoading, setTestResult, setTestScreenshot, onAddToQueue }: PromptTesterPanelProps) {
  const [defaultPrompt, setDefaultPrompt] = useState("")
  const [data, setData] = useState("")
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string | null>(null)
  const [promptInput, setPromptInput] = useState("")
  const [testLoading, setTestLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [includeScreenshot, setIncludeScreenshot] = useState(true)

  // Load custom prompt from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customPrompt")
      if (saved) {
        setCustomPrompt(saved)
        setPromptInput(saved)
      }
    } catch (error) {
      console.error('Error loading custom prompt from localStorage:', error)
    }
  }, [])

  // On conversation change, only update data. Only update prompt if no custom prompt.
  useEffect(() => {
    if (selectedConversation) {
      setLoadingPrompt(true)
      apiService
        .getPrompt(selectedConversation.id, selectedConversation.workflow_id)
        .then((res) => {
          setData(res.data)
          if (!customPrompt) {
            setDefaultPrompt(res.default_prompt)
            setPromptInput(res.default_prompt)
          }
        })
        .finally(() => setLoadingPrompt(false))
    } else {
      setData("")
      if (!customPrompt) {
        setDefaultPrompt("")
        setPromptInput("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation])

  // If customPrompt changes, update promptInput
  useEffect(() => {
    if (customPrompt !== null) {
      setPromptInput(customPrompt)
    }
  }, [customPrompt])

  // Reset toggle when conversation changes
  useEffect(() => {
    setIncludeScreenshot(true)
  }, [selectedConversation])

  // Clean up polling on unmount or conversation change
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [selectedConversation])

  const handleSavePrompt = () => {
    try {
      localStorage.setItem("customPrompt", promptInput)
      setCustomPrompt(promptInput)
    } catch (error) {
      console.error('Error saving custom prompt to localStorage:', error)
      // Could show a toast notification here
    }
  }

  const handleRefreshPrompt = () => {
    setPromptInput(defaultPrompt)
    setCustomPrompt(null)
    localStorage.removeItem("customPrompt")
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptInput(e.target.value)
  }

  const handleTest = async () => {
    if (!promptInput.trim() || !selectedConversation) return
    
    try {
      setTestLoading(true)
      
      // Add test to queue
      await onAddToQueue({
        conversation_id: selectedConversation.id,
        workflow_id: selectedConversation.workflow_id,
        center_name: selectedConversation.center_name,
        workflow_name: selectedConversation.workflow_name,
        prompt: promptInput,
        screenshot_s3_link: selectedConversation.mapping_screenshot_s3_link,
        include_screenshot: !!selectedConversation.mapping_screenshot_s3_link && includeScreenshot
      })
      
      // Don't clear the prompt input - allow user to test the same prompt again
      
    } catch (err) {
      console.error('Error adding test to queue:', err)
    } finally {
      setTestLoading(false)
    }
  }

  const handleClear = () => {
    setPromptInput("")
    setCustomPrompt(null)
    localStorage.removeItem("customPrompt")
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col px-8 pt-8 gap-4">
        <div className="flex-1 flex flex-col">
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
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="ml-auto mr-2" onClick={handleSavePrompt}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  This only saves locally in your browser. It does not save to the database.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleRefreshPrompt}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Restore the original default prompt from the backend.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            placeholder={loadingPrompt ? "Loading prompt..." : "Select a conversation to see the prompt"}
            value={promptInput}
            onChange={handlePromptChange}
            className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 text-base mb-4 custom-scrollbar"
            style={{ height: "100%" }}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="heading-3-neon mb-1">Prompt Data (Mapping + Transcript)</label>
          <Textarea
            placeholder={loadingPrompt ? "Loading data..." : "Select a conversation to see the data"}
            value={data}
            readOnly
            className="flex-1 min-h-0 resize-none rounded-lg border border-slate-700 bg-slate-900/50 text-base custom-scrollbar"
            style={{ height: "100%" }}
          />
        </div>
      </div>
              <div className="px-8 pb-8 flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={!promptInput.trim() || !selectedConversation || loadingPrompt}
              className="flex-1 h-12 text-lg neon-glow bg-emerald-600 hover:bg-emerald-700 mt-4"
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
              className="h-12 px-4 text-lg mt-4"
              size="lg"
            >
              Clear
            </Button>
          </div>
        {jobStatus === 'pending' && <p className="text-sm text-slate-400 text-center mt-2">Running... (Status: {jobStatus})</p>}
        {jobStatus === 'done' && <p className="text-sm text-green-400 text-center mt-2">Completed! (Status: {jobStatus})</p>}
        {jobStatus === 'error' && <p className="text-sm text-red-400 text-center mt-2">Error running prompt. See result panel for details. (Status: {jobStatus})</p>}
        {!selectedConversation && (
          <p className="text-sm text-slate-400 text-center mt-2">Select a conversation to enable testing</p>
        )}
        <p className="text-xs text-slate-500 text-center mt-1">Debug: jobStatus={jobStatus}, testLoading={testLoading.toString()}</p>
      </div>
    </div>
  )
}
