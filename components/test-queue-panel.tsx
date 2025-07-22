"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiService, TestJob, startTestPromptJob, getTestPromptResult } from "@/lib/api"
import { JobCardSkeleton } from "@/components/ui/loading-skeleton"

interface TestQueuePanelProps {
  selectedConversation: any
  onAddToQueue: (jobData: any) => Promise<void>
  conversations?: any[] // Add conversations list to look up names
  onTestResultClick?: (testResult: TestJob) => void
  testJobs?: TestJob[]
  setTestJobs?: (jobs: TestJob[] | ((prev: TestJob[]) => TestJob[])) => void
  refreshTestJobs?: () => Promise<void>
}

export const TestQueuePanel = forwardRef<{ addToQueue: (jobData: any) => Promise<void> }, TestQueuePanelProps>(
  ({ selectedConversation, onAddToQueue, conversations, onTestResultClick, testJobs: externalTestJobs, setTestJobs: externalSetTestJobs, refreshTestJobs }, ref) => {
  const [internalTestJobs, setInternalTestJobs] = useState<TestJob[]>([])
  const [pendingJobs, setPendingJobs] = useState<TestJob[]>([])
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Use external state if provided, otherwise use internal state
  const testJobs = externalTestJobs || internalTestJobs
  const setTestJobs = externalSetTestJobs || setInternalTestJobs

  // Load test jobs from localStorage on mount
  useEffect(() => {
    loadTestJobs()
  }, [])

  const loadTestJobs = async () => {
    try {
      setLoading(true)
      
      // If external state is provided, don't load from backend
      // The parent component will handle loading
      if (externalTestJobs && externalSetTestJobs) {
        setLoading(false)
        return
      }
      
      // Load all jobs from backend (both pending and completed)
      const backendJobs = await apiService.getTestJobs()
      
      // Set all jobs from backend
      setTestJobs(backendJobs)
      
      // Only set pending jobs for polling (not completed ones)
      const pendingJobs = backendJobs.filter(job => job.status === 'pending')
      setPendingJobs(pendingJobs)
      
      // Clear any existing polling state
      setPollingJobs(new Set())
      
    } catch (error) {
      console.error('Error loading test jobs:', error)
      // Fallback to empty state
      setTestJobs([])
      setPendingJobs([])
      setPollingJobs(new Set())
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
    // Don't save during initial load when testJobs is empty
    if (testJobs.length === 0) return
    
    const pendingJobs = testJobs.filter(job => job.status === 'pending')
    localStorage.setItem("testJobs", JSON.stringify(pendingJobs))
    setPendingJobs(pendingJobs)
  }, [testJobs])

  // Sequential queue processing - only for pending jobs
  const processQueue = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      
      // Only poll for jobs that are pending and have real job IDs (from direct API calls)
      const jobsToPoll = testJobs.filter(job => 
        job.status === 'pending' && 
        job.id && 
        !job.id.startsWith('job-') // Real job IDs don't start with 'job-'
      )
      
      if (jobsToPoll.length === 0) {
        setIsProcessing(false)
        return
      }
      
      for (const job of jobsToPoll) {
        // Skip if we're already polling this job
        if (pollingJobs.has(job.id)) {
          continue
        }
        
        // Add to polling set to prevent duplicate polls
        setPollingJobs(prev => new Set(prev).add(job.id))
        
        try {
          const result = await getTestPromptResult(job.id)
          
          if (result.status === 'done' || result.status === 'error') {
            const updatedJob: TestJob = {
              ...job,
              status: result.status as 'done' | 'error', 
              result: result.result, 
              log_messages: result.log_messages,
              screenshot_url: result.screenshot_url, 
              error: result.error 
            }
            
            // Update the job in the backend
            try {
              await apiService.createTestJob(updatedJob)
            } catch (error) {
              console.error(`Error updating job ${job.id} in backend:`, error)
            }
            
            // Update local state
            setTestJobs(prev => prev.map(j => 
              j.id === job.id ? updatedJob : j
            ))
            
            // Remove from pending jobs list
            setPendingJobs(prev => prev.filter(j => j.id !== job.id))
            
            // Remove from polling set
            setPollingJobs(prev => {
              const newSet = new Set(prev)
              newSet.delete(job.id)
              return newSet
            })
            
          } else {
            // Job is still pending, remove from polling set to allow re-polling later
            setPollingJobs(prev => {
              const newSet = new Set(prev)
              newSet.delete(job.id)
              return newSet
            })
          }
        } catch (error) {
          console.error(`Error polling job ${job.id}:`, error)
          // Remove from polling set on error
          setPollingJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(job.id)
            return newSet
          })
        }
      }
      
    } catch (error) {
      console.error('Error in processQueue:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Single useEffect to handle queue processing - RE-ENABLED for polling completed jobs
  useEffect(() => {
    if (pendingJobs.length > 0 && !isProcessing) {
      processQueue()
    }
  }, [pendingJobs.length, isProcessing])

  // Handle adding new job to queue - DISABLED since we're making direct API calls
  const handleAddToQueue = async (jobData: any) => {
    // This function is disabled since we're making direct API calls from the dashboard
    return
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
    window.open(`/test-results/${jobId}`, '_blank')
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
            <div className="h-8 w-20 bg-slate-700/50 animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <JobCardSkeleton key={index} />
              ))}
            </div>
          </ScrollArea>
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
            <Button onClick={refreshTestJobs || loadTestJobs} variant="outline" size="sm">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
              {testJobs.map((job, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-1">
                        {job.status === 'done' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewJob(job.id)}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeJob(job.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID:</span>
                        <span className="font-mono text-xs truncate max-w-[120px]" title={job.id}>
                          {job.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Center:</span>
                        <span className="font-medium">{job.center_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Workflow:</span>
                        <span className="font-medium">{job.workflow_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time:</span>
                        <span className="text-xs">
                          {new Date(job.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {job.error && (
                        <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 rounded">
                          Error: {job.error}
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