"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { getTestPromptResult, startTestPromptJob } from "@/lib/api"

interface TestJob {
  id: string
  conversation_id: string
  workflow_id: string
  center_name?: string
  workflow_name?: string
  prompt: string
  status: 'pending' | 'submitted' | 'done' | 'error'
  timestamp: string
  result?: any
  log_messages?: string[]
  screenshot_url?: string
  error?: string
  screenshot_s3_link?: string
  llm_generation_time?: number
}

interface TestQueuePanelProps {
  selectedConversation: any
  onAddToQueue: (jobData: any) => Promise<void>
  conversations?: any[] // Add conversations list to look up names
}

export const TestQueuePanel = forwardRef<{ addToQueue: (jobData: any) => Promise<void> }, TestQueuePanelProps>(
  ({ selectedConversation, onAddToQueue, conversations }, ref) => {
  const [testJobs, setTestJobs] = useState<TestJob[]>([])
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  // Load test jobs from localStorage on mount
  useEffect(() => {
    console.log('TestQueuePanel: Loading test jobs from localStorage')
    const saved = localStorage.getItem("testJobs")
    console.log('TestQueuePanel: Saved test jobs from localStorage:', saved)
    if (saved) {
      try {
        const jobs = JSON.parse(saved)
        console.log('TestQueuePanel: Parsed test jobs:', jobs)
        if (Array.isArray(jobs) && jobs.length > 0) {
          console.log('TestQueuePanel: Setting test jobs with', jobs.length, 'jobs')
          setTestJobs(jobs)
          // Start polling for pending and submitted jobs
          jobs.forEach((job: TestJob) => {
            if (job.status === 'pending' || job.status === 'submitted') {
              setPollingJobs(prev => new Set(prev).add(job.id))
            }
          })
        } else {
          console.log('TestQueuePanel: Jobs array is empty or invalid')
        }
      } catch (error) {
        console.error('Error loading test jobs:', error)
      }
    } else {
      console.log('TestQueuePanel: No saved test jobs found in localStorage')
    }
  }, [])

  // Update existing jobs with proper names when conversations are loaded
  useEffect(() => {
    if (conversations && conversations.length > 0 && testJobs.length > 0) {
      console.log('TestQueuePanel: Updating jobs with conversation names')
      const updatedJobs = testJobs.map((job: TestJob) => {
        if (!job.center_name || !job.workflow_name) {
          const conversation = conversations.find(c => c.id === job.conversation_id)
          return {
            ...job,
            center_name: job.center_name || conversation?.center_name || 'Unknown',
            workflow_name: job.workflow_name || conversation?.workflow_name || job.workflow_id || 'Unknown'
          }
        }
        return job
      })
      
      // Only update if there are actual changes
      const hasChanges = updatedJobs.some((job, index) => 
        job.center_name !== testJobs[index]?.center_name || 
        job.workflow_name !== testJobs[index]?.workflow_name
      )
      
      if (hasChanges) {
        console.log('TestQueuePanel: Updating jobs with new names')
        setTestJobs(updatedJobs)
      }
    }
  }, [conversations, testJobs.length])

  // Save test jobs to localStorage whenever they change
  useEffect(() => {
    console.log('TestQueuePanel: Saving test jobs to localStorage:', testJobs)
    localStorage.setItem("testJobs", JSON.stringify(testJobs))
  }, [testJobs])

  // Poll for submitted jobs
  useEffect(() => {
    if (pollingJobs.size === 0) return

    const pollInterval = setInterval(async () => {
      const submittedJobs = testJobs.filter(job => 
        pollingJobs.has(job.id) && job.status === 'submitted'
      )

      for (const job of submittedJobs) {
        try {
          const result = await getTestPromptResult(job.id)
          
          if (result.status === 'done' || result.status === 'error') {
            setTestJobs(prev => prev.map(j => 
              j.id === job.id 
                ? { 
                    ...j, 
                    status: result.status, 
                    // result: result.result, 
                    log_messages: result.log_messages,
                    screenshot_url: result.screenshot_url, 
                    error: result.error,
                    llm_generation_time: result.llm_generation_time
                  }
                : j
            ))
            // Remove from polling set
            setPollingJobs(prev => {
              const newSet = new Set(prev)
              newSet.delete(job.id)
              return newSet
            })
          }
        } catch (error) {
          console.error(`Error polling job ${job.id}:`, error)
          // On error, remove from polling to avoid infinite retries
          setPollingJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(job.id)
            return newSet
          })
        }
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [pollingJobs, testJobs])

  // Sequential queue processing
  const processQueue = async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      const pendingJobs = testJobs.filter(job => job.status === 'pending')
      
      for (const job of pendingJobs) {
        try {
          // Start the job
          const req = {
            conversation_id: job.conversation_id,
            workflow_id: job.workflow_id,
            prompt: job.prompt,
            screenshot_s3_link: job.screenshot_s3_link || undefined,
            include_screenshot: !!job.screenshot_s3_link,
          }
          console.log("req", req)
          // return;
          
          const { job_id } = await startTestPromptJob(req)
          // Update job with real job_id and add to polling
          setTestJobs(prev => prev.map(j => 
            j.id === job.id ? { ...j, id: job_id, status: 'submitted' } : j
          ))
          setPollingJobs(prev => new Set(prev).add(job_id))
          
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error)
          setTestJobs(prev => prev.map(j => 
            j.id === job.id 
              ? { ...j, status: 'error', error: error instanceof Error ? error.message : String(error) }
              : j
          ))
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Process queue when jobs are added or when component mounts with pending jobs
  useEffect(() => {
    const pendingJobs = testJobs.filter(job => job.status === 'pending')
    if (pendingJobs.length > 0 && !isProcessing) {
      processQueue()
    }
  }, [testJobs, isProcessing])

  // Handle adding new job to queue
  const handleAddToQueue = async (jobData: any) => {
    try {
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
        result: undefined,
        screenshot_url: undefined,
        error: undefined,
        screenshot_s3_link: jobData.screenshot_s3_link
      }
      
      console.log('Created new job:', newJob)
      setTestJobs(prev => {
        console.log('Previous jobs:', prev)
        const updated = [newJob, ...prev]
        console.log('Updated jobs:', updated)
        console.log('TestQueuePanel: About to update testJobs state, this should trigger localStorage save')
        return updated
      })
      
    } catch (error) {
      console.error('Error adding job to queue:', error)
    }
  }

  // Expose the addToQueue function via ref
  useImperativeHandle(ref, () => ({
    addToQueue: handleAddToQueue
  }), [])

  // Debug: Check if component is being unmounted
  useEffect(() => {
    console.log('TestQueuePanel: Component mounted')
    return () => {
      console.log('TestQueuePanel: Component unmounting - this might be causing the issue')
    }
  }, [])





  const removeJob = (jobId: string) => {
    setTestJobs(prev => prev.filter(job => job.id !== jobId))
    setPollingJobs(prev => {
      const newSet = new Set(prev)
      newSet.delete(jobId)
      return newSet
    })
  }

  const clearQueue = () => {
    console.log('TestQueuePanel: Clearing queue - this should only happen when user clicks Clear Queue button')
    setTestJobs([])
    setPollingJobs(new Set())
    localStorage.removeItem("testJobs")
  }

  const viewJob = (jobId: string) => {
    router.push(`/test-results/${jobId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-400" />
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-400">Pending</Badge>
      case 'submitted':
        return <Badge variant="secondary" className="text-blue-400">Submitted</Badge>
      case 'done':
        return <Badge variant="default" className="text-green-400">Done</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 neon-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="heading-2-neon">Test Queue</h2>
            <Badge variant="secondary" className="neon-border">
              {testJobs.length}
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearQueue}
            disabled={testJobs.length === 0}
          >
            Clear Queue
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {testJobs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tests in queue</p>
              <p className="text-sm">Add tests to see them here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {testJobs.map((job) => (
              <Card key={job.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'done' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewJob(job.id)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeJob(job.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">Job ID:</span> {job.id}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">Center:</span> {job.center_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">Workflow:</span> {job.workflow_name || job.workflow_id || 'Unknown'}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">Screenshot Included:</span> {job.screenshot_s3_link ? 'Yes' : 'No'}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">LLM Latency:</span> {job.llm_generation_time ? `${Math.floor(job.llm_generation_time / 60)}m ${Math.floor(job.llm_generation_time % 60)}s` : 'N/A'}
                    </div>
                    {job.timestamp && (
                      <div className="text-xs text-slate-500">
                        {new Date(job.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
})