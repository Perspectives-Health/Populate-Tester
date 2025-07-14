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

interface PromptTesterPanelProps {
  selectedConversation: Conversation | null
  isLoading: boolean
  setTestResult: (result: any) => void
  setTestScreenshot: (url: string | null) => void
}

export function PromptTesterPanel({ selectedConversation, isLoading, setTestResult, setTestScreenshot }: PromptTesterPanelProps) {
  const [defaultPrompt, setDefaultPrompt] = useState("")
  const [data, setData] = useState("")
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string | null>(null)
  const [promptInput, setPromptInput] = useState("")
  const [testLoading, setTestLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load custom prompt from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("customPrompt")
    if (saved) {
      setCustomPrompt(saved)
      setPromptInput(saved)
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

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handleSavePrompt = () => {
    localStorage.setItem("customPrompt", promptInput)
    setCustomPrompt(promptInput)
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
    setTestLoading(true)
    setTestScreenshot(null)
    setTestResult(null)
    setJobStatus('pending')
    setJobId(null)
    // Start the job
    try {
      const req = {
        conversation_id: selectedConversation.id, // snake_case
        workflow_id: selectedConversation.workflow_id, // snake_case
        prompt: promptInput,
        screenshot_s3_link: selectedConversation.mapping_screenshot_s3_link,
      }
      const { job_id } = await startTestPromptJob(req)
      setJobId(job_id)
      // Start polling every 5 seconds
      pollingRef.current = setInterval(async () => {
        const res = await getTestPromptResult(job_id)
        if (res.status === 'done') {
          setTestResult(res.result)
          setTestScreenshot(res.screenshot_url || null)
          setJobStatus('done')
          setTestLoading(false)
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (res.status === 'error') {
          setTestResult({ error: res.error })
          setTestScreenshot(null)
          setJobStatus('error')
          setTestLoading(false)
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      }, 5000)
    } catch (err) {
      setTestResult({ error: err instanceof Error ? err.message : String(err) })
      setTestScreenshot(null)
      setJobStatus('error')
      setTestLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col px-8 pt-8 gap-4">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center mb-1">
            <label className="text-sm font-medium text-slate-300 mr-2">Prompt Instructions</label>
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
            className="flex-1 min-h-0 resize-none neon-border bg-slate-900/50 text-base mb-4"
            style={{ height: "100%" }}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-medium text-slate-300 mb-1">Prompt Data (Mapping + Transcript)</label>
          <Textarea
            placeholder={loadingPrompt ? "Loading data..." : "Select a conversation to see the data"}
            value={data}
            readOnly
            className="flex-1 min-h-0 resize-none neon-border bg-slate-900/50 text-base"
            style={{ height: "100%" }}
          />
        </div>
      </div>
      <div className="px-8 pb-8 flex flex-col gap-2">
        <Button
          onClick={handleTest}
          disabled={!promptInput.trim() || !selectedConversation || loadingPrompt || testLoading}
          className="w-full h-12 text-lg neon-glow bg-emerald-600 hover:bg-emerald-700 mt-4"
          size="lg"
        >
          {testLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-3" />
              Test Prompt
            </>
          )}
        </Button>
        {jobStatus === 'pending' && <p className="text-sm text-slate-400 text-center mt-2">Running...</p>}
        {jobStatus === 'error' && <p className="text-sm text-red-400 text-center mt-2">Error running prompt. See result panel for details.</p>}
        {!selectedConversation && (
          <p className="text-sm text-slate-400 text-center mt-2">Select a conversation to enable testing</p>
        )}
      </div>
    </div>
  )
}
