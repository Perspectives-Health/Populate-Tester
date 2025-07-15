"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Clock, Copy, Code, Image as ImageIcon } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useState } from "react"
import React from "react"

interface AdvancedResultsPanelProps {
  results: any[]
  selectedConversation: any
  onClear: () => void
  isPending: boolean
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

export function AdvancedResultsPanel({ results, selectedConversation, onClear, isPending }: AdvancedResultsPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

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

  // Pretty-print JSON or add line breaks for readability
  const formatResultText = (text: any) => {
    if (!text) return ""
    try {
      if (typeof text === "string") {
        // Try to parse as JSON, else just add line breaks
        const parsed = JSON.parse(text)
        return parsed
      }
      return text
    } catch {
      // Fallback: add line breaks every 80 chars
      return text.replace(/(.{80})/g, "$1\n")
    }
  }

  // Parse and format the numbered JSON structure
  const formatNumberedResults = (data: any) => {
    if (!data || typeof data !== 'object') return null
    
    // If the data has a "text" field that contains JSON, parse it
    if (data.text && typeof data.text === 'string') {
      try {
        // Remove markdown code block if present
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

  // Filter out empty results
  const filteredResults = results.filter(result => !isEmptyResult(result))

  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0))
  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, filteredResults.length - 1))

  // Reset index if results change
  React.useEffect(() => {
    setCurrentIndex(0)
  }, [filteredResults.length])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 neon-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="heading-2-neon">Test Results</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="neon-border">
              {filteredResults.length}
            </Badge>
            <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
            {isPending && <span className="ml-2 text-yellow-400">Running...</span>}
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {filteredResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results yet</p>
              <p className="text-sm">Test a prompt to see results here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <div className="flex items-center gap-4 mb-4">
              <Button onClick={handlePrev} disabled={currentIndex === 0} variant="outline" size="sm">Previous</Button>
              <span className="text-sm text-muted-foreground">Test #{filteredResults.length - currentIndex}</span>
              <Button onClick={handleNext} disabled={currentIndex === filteredResults.length - 1} variant="outline" size="sm">Next</Button>
            </div>
            {(() => {
              const result = filteredResults[currentIndex]
              // Defensive: allow for new result shape and nulls
              let key = "result-" + currentIndex;
              if (result && (result.timestamp || result.time || result.created_at)) {
                key = String(result.timestamp || result.time || result.created_at) + currentIndex;
              }
              let json = result?.result || result?.text || result || {};
              const screenshot = result?.screenshot_url || result?.screenshot || null;

              // If json is a string, try to parse it and remove ugly backslashes/quotes
              let prettyJson: any = json;
              if (typeof json === 'string') {
                // Remove markdown code block if present
                let cleaned = json.trim();
                if (cleaned.startsWith('```json')) {
                  cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
                }
                try {
                  prettyJson = JSON.parse(cleaned);
                } catch {
                  // Try to fix common issues (double-escaped)
                  try {
                    prettyJson = JSON.parse(cleaned.replace(/\\"/g, '"').replace(/\\n/g, '\n'));
                  } catch {
                    prettyJson = cleaned;
                  }
                }
              }

              return (
                <Card className="w-full max-w-3xl border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Test #{filteredResults.length - currentIndex}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(formatJSON(prettyJson))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="p-4 rounded-lg border border-slate-700 mt-2 overflow-x-auto custom-scrollbar bg-slate-800">
                      {(() => {
                        const formattedData = formatNumberedResults(prettyJson)
                        
                        if (formattedData && typeof formattedData === 'object') {
                          return (
                            <div className="space-y-2">
                              {Object.entries(formattedData).map(([key, value]: [string, any]) => (
                                <div key={key} className="border border-slate-600 rounded p-3 bg-slate-700">
                                  <div className="flex items-start gap-3">
                                    <span className="text-yellow-400 font-bold text-sm min-w-[30px]">
                                      {key}
                                    </span>
                                    <div className="flex-1 space-y-2">
                                      {/* Question Text */}
                                      {value.question_text && (
                                        <div>
                                          <span className="text-purple-400 text-xs font-medium">Question:</span>
                                          <div className="text-slate-200 text-sm mt-1">
                                            {value.question_text}
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
                              {prettyJson?.log_messages && prettyJson.log_messages.length > 0 && (
                                <div className="border border-slate-600 rounded p-3 bg-slate-700 mt-4">
                                  <div className="mb-2">
                                    <span className="text-cyan-400 text-xs font-medium">Log Messages:</span>
                                  </div>
                                  <div className="space-y-1">
                                    {prettyJson.log_messages.map((message: string, index: number) => (
                                      <div key={index} className="text-slate-300 text-sm">
                                        {message}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        }
                        
                        // Fallback to original formatting
                        return (
                          <pre className="whitespace-pre-wrap break-words text-xs text-yellow-300">
                            {formatResultText(prettyJson)}
                          </pre>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        )}
      </ScrollArea>
      <style jsx global>{`
        pre[class*='language-'] {
          padding-left: 16px !important;
          padding-right: 16px !important;
          box-sizing: border-box !important;
        }
      `}</style>
    </div>
  )
}
