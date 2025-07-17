"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiService, TestJob, startTestPromptJob, getTestPromptResult } from "@/lib/api"

interface TestQueuePanelProps {
  selectedConversation: any
  onAddToQueue: (jobData: any) => Promise<void>
  conversations?: any[] // Add conversations list to look up names
}

export const TestQueuePanel = forwardRef<{ addToQueue: (jobData: any) => Promise<void> }, TestQueuePanelProps>(
  ({ selectedConversation, onAddToQueue, conversations }, ref) => {
  const [testJobs, setTestJobs] = useState<TestJob[]>([])
  const [pendingJobs, setPendingJobs] = useState<TestJob[]>([])
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load test jobs from localStorage on mount
  useEffect(() => {
    loadTestJobs()
  }, [])

  const loadTestJobs = async () => {
    try {
      setLoading(true)
      
      // First, try to load from backend (completed jobs)
      const backendJobs = await apiService.getTestJobs()
      
      // Ensure all backend jobs are marked as completed
      const completedBackendJobs = backendJobs.map(job => ({
        ...job,
        status: 'done' as const
      }))
      
      // Then load from localStorage (pending jobs)
      const saved = localStorage.getItem("testJobs")
      let localStorageJobs: TestJob[] = []
      
      if (saved) {
        try {
          const jobs = JSON.parse(saved)
          if (Array.isArray(jobs) && jobs.length > 0) {
            localStorageJobs = jobs
          }
        } catch (error) {
          console.error('Error parsing saved test jobs:', error)
        }
      }
      
      // Combine backend jobs (completed) with localStorage jobs (pending)
      const allJobs = [...completedBackendJobs, ...localStorageJobs]
      setTestJobs(allJobs)
      
      // Set pending jobs separately - only localStorage jobs can be pending
      const pendingJobs = localStorageJobs.filter(job => job.status === 'pending')
      setPendingJobs(pendingJobs)
      
      // Only start polling for pending jobs that haven't been processed yet
      pendingJobs.forEach((job: TestJob) => {
        setPollingJobs(prev => new Set(prev).add(job.id))
      })
      
    } catch (error) {
      console.error('Error loading test jobs:', error)
      // Fallback to localStorage only
      const saved = localStorage.getItem("testJobs")
      if (saved) {
        try {
          const jobs = JSON.parse(saved)
          if (Array.isArray(jobs) && jobs.length > 0) {
            setTestJobs(jobs)
            const pendingJobs = jobs.filter(job => job.status === 'pending')
            setPendingJobs(pendingJobs)
            pendingJobs.forEach((job: TestJob) => {
              setPollingJobs(prev => new Set(prev).add(job.id))
            })
          }
        } catch (error) {
          console.error('Error parsing saved test jobs:', error)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Update existing jobs with proper names when conversations are loaded
  useEffect(() => {
    if (conversations && conversations.length > 0 && testJobs.length > 0) {
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
        setTestJobs(updatedJobs)
        // Update localStorage jobs with new names
        const localStorageJobs = updatedJobs.filter(job => job.status === 'pending')
        localStorage.setItem("testJobs", JSON.stringify(localStorageJobs))
        setPendingJobs(localStorageJobs)
      }
    }
  }, [conversations, testJobs.length])

  // Save pending jobs to localStorage whenever they change
  useEffect(() => {
    const pendingJobs = testJobs.filter(job => job.status === 'pending')
    localStorage.setItem("testJobs", JSON.stringify(pendingJobs))
    setPendingJobs(pendingJobs)
  }, [testJobs])

  // Sequential queue processing - only for pending jobs
  const processQueue = async () => {
    if (isProcessing) return
    
    setIsProcessing(true)
    
    try {
      // Only process pending jobs from localStorage (not backend jobs)
      const jobsToProcess = pendingJobs.filter(job => job.status === 'pending')
      
      for (const job of jobsToProcess) {
        if (job.status !== 'pending') continue // Skip if job was already processed
        
        try {
          // Start the job
          const req = {
            conversation_id: job.conversation_id,
            workflow_id: job.workflow_id,
            prompt: job.prompt,
            screenshot_s3_link: job.screenshot_s3_link || undefined,
          }
          
          const { job_id } = await startTestPromptJob(req)
          
          // Update job with real job_id
          setTestJobs(prev => prev.map(j => 
            j.id === job.id ? { ...j, id: job_id } : j
          ))
          
          // Poll for completion
          let pollCount = 0
          const maxPolls = 60 // 5 minutes max
          
          while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
            
            try {
              const result = await getTestPromptResult(job_id)
              
              if (result.status === 'done' || result.status === 'error') {
                const updatedJob: TestJob = {
                  ...job,
                  id: job_id,
                  status: result.status as 'done' | 'error', 
                  result: result.result, 
                  log_messages: result.log_messages,
                  screenshot_url: result.screenshot_url, 
                  error: result.error 
                }
                
                setTestJobs(prev => prev.map(j => 
                  j.id === job_id ? updatedJob : j
                ))
                
                // If job is completed, post to backend
                if (result.status === 'done') {
                  try {
                    await apiService.createTestJob(updatedJob)
                    console.log('Job completed and posted to backend:', updatedJob.id)
                  } catch (error) {
                    console.error('Error posting completed job to backend:', error)
                  }
                }
                
                break
              }
            } catch (error) {
              console.error(`Error polling job ${job_id}:`, error)
            }
            
            pollCount++
          }
          
          // If max polls reached, mark as error
          if (pollCount >= maxPolls) {
            const errorJob: TestJob = { 
              ...job, 
              id: job_id, 
              status: 'error', 
              error: 'Job timed out after 5 minutes' 
            }
            setTestJobs(prev => prev.map(j => 
              j.id === job_id ? errorJob : j
            ))
          }
          
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error)
          const errorJob: TestJob = { 
            ...job, 
            status: 'error', 
            error: error instanceof Error ? error.message : String(error) 
          }
          setTestJobs(prev => prev.map(j => 
            j.id === job.id ? errorJob : j
          ))
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Single useEffect to handle queue processing
  useEffect(() => {
    if (pendingJobs.length > 0 && !isProcessing) {
      processQueue()
    }
  }, [pendingJobs.length, isProcessing])

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
        screenshot_s3_link: jobData.screenshot_s3_link
      }
      
      // Add to local state (will be saved to localStorage via useEffect)
      setTestJobs(prev => [...prev, newJob])
      
      // Start polling for this job
      setPollingJobs(prev => new Set(prev).add(newJob.id))
      
    } catch (error) {
      console.error('Error adding job to queue:', error)
    }
  }

  // Expose addToQueue method to parent
  useImperativeHandle(ref, () => ({
    addToQueue: handleAddToQueue
  }))

  const removeJob = async (jobId: string) => {
    try {
      // If job is completed, delete from backend
      const job = testJobs.find(j => j.id === jobId)
      if (job && job.status === 'done') {
        await apiService.deleteTestJob(jobId)
      }
      
      // Remove from local state
      setTestJobs(prev => prev.filter(job => job.id !== jobId))
    } catch (error) {
      console.error('Error removing job:', error)
      // Fallback: just remove from local state
      setTestJobs(prev => prev.filter(job => job.id !== jobId))
    }
  }

  const clearQueue = async () => {
    try {
      // Clear completed jobs from backend
      await apiService.clearAllTestJobs()
      
      // Clear all jobs from local state
      setTestJobs([])
      setPendingJobs([])
      localStorage.removeItem("testJobs")
    } catch (error) {
      console.error('Error clearing queue:', error)
      // Fallback: just clear local state
      setTestJobs([])
      setPendingJobs([])
      localStorage.removeItem("testJobs")
    }
  }

  const viewJob = (jobId: string) => {
    router.push(`/test-results/${jobId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'done':
        return <Badge variant="default">Done</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="heading-2-neon">Test Queue</h2>
            <Button onClick={loadTestJobs} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading test jobs...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="heading-2-neon">Test Queue ({testJobs.length})</h2>
          <div className="flex items-center gap-2">
            <Button onClick={loadTestJobs} variant="outline" size="sm">
              Refresh
            </Button>
            {testJobs.length > 0 && (
              <Button onClick={clearQueue} variant="destructive" size="sm">
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {testJobs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No test jobs</p>
                <p className="text-sm">Add tests to see them here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {testJobs.map((job, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
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
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeJob(job.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Job ID:</span>
                        <span className="text-muted-foreground font-mono">{job.id}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Center:</span>
                        <span className="text-muted-foreground">{job.center_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Workflow:</span>
                        <span className="text-muted-foreground">{job.workflow_name || job.workflow_id || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Timestamp:</span>
                        <span className="text-muted-foreground">
                          {new Date(job.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {job.error && (
                        <div className="text-sm text-red-500">
                          <span className="font-medium">Error:</span> {job.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
})