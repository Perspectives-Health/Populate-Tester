"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Code } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Plus, Minus, RefreshCw } from "lucide-react";
import { getTestPromptResult } from "@/lib/api"

interface TestResult {
  id: string
  status: 'pending' | 'done' | 'error'
  result?: any
  log_messages?: string[]
  screenshot_url?: string
  error?: string
  timestamp?: string
  llm_generation_time?: number
  total_time?: number
}

export default function TestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const testId = params.id as string

  useEffect(() => {
    console.log('testResult:', testResult)
  }, [testResult])

  useEffect(() => {
    if (!testId) return

    const fetchTestResult = async () => {
      try {
        setLoading(true)
        const result = await getTestPromptResult(testId)
        setTestResult(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchTestResult()
  }, [testId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const formatResultText = (text: any) => {
    if (!text) return ""
    console.log('formatResultText called with:', text)
    try {
      if (typeof text === "string") {
        const parsed = JSON.parse(text)
        return parsed
      }
      return text
    } catch {
      return text.replace(/(.{80})/g, "$1\n")
    }
  }

  const formatNumberedResults = (data: any) => {
    if (!data || typeof data !== 'object') return null
    
    if (data.text && typeof data.text === 'string') {
      try {
        let cleaned = data.text.trim()
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim()
        }
        const parsed = JSON.parse(cleaned)
        return parsed
      } catch {
        return data
      }
    }
    
    return data
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading test results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  if (!testResult) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Test result not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 neon-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="heading-1-neon">Test Results</h1>
              <p className="text-slate-400">Test ID: {testId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={testResult.status === 'done' ? 'default' : testResult.status === 'error' ? 'destructive' : 'secondary'}
              className="neon-border"
            >
              {testResult.status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Test Results */}
        <div className="w-1/2 border-r border-slate-800">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-800 neon-accent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="heading-2-neon">Test Results</h2>
                  {testResult.llm_generation_time && (
                    <Badge variant="outline" className="text-xs">
                      LLM: {Math.floor(testResult.llm_generation_time / 60)}m {Math.floor(testResult.llm_generation_time % 60)}s
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formatJSON(testResult.result))}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {testResult.status === 'pending' ? (
                <div className="flex items-center justify-center h-full text-slate-400 p-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-3"></div>
                    <p className="font-medium">Test in progress...</p>
                    <p className="text-sm">Please wait while the test completes</p>
                  </div>
                </div>
              ) : testResult.status === 'error' ? (
                <div className="flex items-center justify-center h-full text-red-400 p-6">
                  <div className="text-center">
                    <p className="font-medium">Test failed</p>
                    <p className="text-sm">{testResult.error}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 max-w-full">
                  <Card className="w-full max-w-full border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Completed</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(formatJSON(testResult.result))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="rounded-lg border border-slate-700 mt-2 bg-slate-800 w-3/5">
                        {(() => {
                          const formattedData = formatNumberedResults(testResult.result)
                          
                          if (formattedData && typeof formattedData === 'object') {
                            return (
                              <div className="space-y-2 p-4 max-w-full">
                                {Object.entries(formattedData).map(([key, value]: [string, any]) => (
                                  <div key={key} className="border border-slate-600 rounded p-3 bg-slate-700 h-auto flex flex-col max-w-full">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <span className="text-yellow-400 font-bold text-sm flex-shrink-0">
                                        {key}
                                      </span>
                                      <div className="flex-1 space-y-2 min-w-0">
                                        {/* Question Text */}
                                        {value.question_text && (
                                          <div className="break-words">
                                            <span className="text-purple-400 text-xs font-medium block">Question:</span>
                                            <div className="text-slate-200 text-sm mt-1 whitespace-normal break-words">
                                              {value.question_text}
                                            </div>
                                          </div>
                                        )}
                                        {/* Processed Question Text */}
                                        {value.processed_question_text && (
                                          <div className="break-words">
                                            <span className="text-indigo-400 text-xs font-medium block">Processed Question:</span>
                                            <div className="text-slate-200 text-sm mt-1 italic whitespace-normal break-words">
                                              {value.processed_question_text}
                                            </div>
                                          </div>
                                        )}
                                        {/* Answer */}
                                        {value.answer !== undefined && (
                                          <div>
                                            <span className="text-blue-400 text-xs font-medium">Answer:</span>
                                            <div className="text-yellow-300 text-sm mt-1">
                                              {value.answer === null ? 'null' : value.answer === '' ? '(empty)' : value.answer}
                                            </div>
                                          </div>
                                        )}
                                        {/* Evidence */}
                                        {value.evidence && (
                                          <div>
                                            <span className="text-green-400 text-xs font-medium">Evidence:</span>
                                            <div className="text-yellow-300 text-sm mt-1">
                                              {value.evidence}
                                            </div>
                                          </div>
                                        )}
                                        {/* Type */}
                                        {value.type && (
                                          <div>
                                            <span className="text-orange-400 text-xs font-medium">Type:</span>
                                            <div className="text-slate-300 text-sm mt-1">
                                              {value.type}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Log Messages Section */}
                                {(testResult.result?.log_messages && testResult.result.log_messages.length > 0) || 
                                 (testResult.log_messages && testResult.log_messages.length > 0) ? (
                                  <div className="border border-slate-600 rounded p-3 bg-slate-700 mt-4">
                                    <div className="mb-2">
                                      <span className="text-cyan-400 text-xs font-medium">Log Messages:</span>
                                    </div>
                                    <div className="space-y-1">
                                      {(testResult.result?.log_messages || testResult.log_messages || []).map((message: string, index: number) => (
                                        <div key={index} className="text-slate-300 text-sm">
                                          {message}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )
                          }
                          
                          return (
                            <pre className="whitespace-pre-wrap break-words text-xs text-yellow-300">
                              {formatResultText(testResult.result)}
                            </pre>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Right Panel - Screenshot */}
        <div className="w-1/2">
          {testResult.screenshot_url ? (
            <div className="h-full w-full flex flex-col min-w-0 min-h-0">
              <TransformWrapper
                minScale={1}
                maxScale={5}
                initialScale={1}
                wheel={{ disabled: true }}
                doubleClick={{ disabled: true }}
                pinch={{ disabled: true }}
                panning={{ disabled: false }}
                zoomAnimation={{ size: 3 }}
                limitToBounds={true}
              >
                {({ zoomIn, zoomOut, resetTransform, ...rest }) => {
                  const scale = (rest as any).state?.scale ?? 1;
                  return (
                    <>
                      <div className="p-4 border-b border-slate-800 neon-accent flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="heading-3-neon">Screenshot</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                            onClick={() => { zoomOut(0.5); }}
                            title="Zoom Out"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                            onClick={() => { zoomIn(0.5); }}
                            title="Zoom In"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200"
                            onClick={() => {resetTransform(); }}
                            title="Fit to Screen"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-900 rounded-b-lg border border-slate-700 border-t-0 overflow-hidden flex flex-col min-w-0 min-h-0">
                        <TransformComponent>
                          <img
                            src={testResult.screenshot_url}
                            alt="Test Screenshot"
                            className="select-none pointer-events-auto max-w-full max-h-full"
                            draggable={false}
                            style={{
                              width: "100%",
                              maxWidth: "100%",
                              height: "auto",
                              display: "block",
                              objectFit: "contain"
                            }}
                          />
                        </TransformComponent>
                      </div>
                    </>
                  );
                }}
              </TransformWrapper>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <p className="font-medium">No screenshot available</p>
                <p className="text-sm">This test didn't generate a screenshot</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 