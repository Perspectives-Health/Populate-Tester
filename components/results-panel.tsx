"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, Copy, Eye, EyeOff } from "lucide-react"
import type { TestResult, Conversation } from "./conversations-dashboard"

interface ResultsPanelProps {
  results: TestResult[]
  selectedConversation: Conversation | null
}

export function ResultsPanel({ results, selectedConversation }: ResultsPanelProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())
  const [showOriginal, setShowOriginal] = useState(true)

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId)
    } else {
      newExpanded.add(resultId)
    }
    setExpandedResults(newExpanded)
  }

  const filteredResults = selectedConversation
    ? results.filter((r) => r.conversationId === selectedConversation.id)
    : results

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const compareAnswers = (original: any, generated: any) => {
    const originalKeys = Object.keys(original || {})
    const generatedKeys = Object.keys(generated || {})
    const allKeys = [...new Set([...originalKeys, ...generatedKeys])]

    return allKeys.map((key) => ({
      field: key,
      original: original?.[key] || "N/A",
      generated: generated?.[key] || "N/A",
      matches: original?.[key] === generated?.[key],
    }))
  }

  return (
    <div className="flex flex-col h-1/2 p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test Results
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowOriginal(!showOriginal)}>
                {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showOriginal ? "Hide" : "Show"} Original
              </Button>
              <Badge variant="secondary">{filteredResults.length} results</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {filteredResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No test results yet</p>
                <p className="text-sm">Run a prompt test to see results here</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {filteredResults.map((result, index) => {
                  const isExpanded = expandedResults.has(result.conversationId + result.timestamp)
                  const resultId = result.conversationId + result.timestamp
                  const comparison = selectedConversation
                    ? compareAnswers(selectedConversation.originalAnswers, result.generatedAnswers)
                    : []

                  return (
                    <Card key={resultId} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Test #{filteredResults.length - index}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {result.processingTime}ms
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatTimestamp(result.timestamp)}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(result.generatedAnswers, null, 2))}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleExpanded(resultId)}>
                              {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="text-xs">
                            <strong>Prompt:</strong>
                            <p className="text-muted-foreground mt-1 line-clamp-2">{result.prompt}</p>
                          </div>

                          {isExpanded && (
                            <>
                              <Separator />
                              <div className="space-y-3">
                                {comparison.map((comp, i) => (
                                  <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{comp.field}</span>
                                      {comp.matches ? (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <XCircle className="h-3 w-3 text-red-500" />
                                      )}
                                    </div>

                                    {showOriginal && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Original:</span>
                                        <p className="bg-muted p-1 rounded text-xs mt-1">{comp.original}</p>
                                      </div>
                                    )}

                                    <div className="text-xs">
                                      <span className="text-muted-foreground">Generated:</span>
                                      <p className="bg-blue-50 p-1 rounded text-xs mt-1">{comp.generated}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
