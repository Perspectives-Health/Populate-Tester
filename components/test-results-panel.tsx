"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Clock, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TestResultsPanelProps {
  results: any[] // Changed from TestResult[]
  selectedConversation: any | null // Changed from Conversation | null
}

export function TestResultsPanel({ results, selectedConversation }: TestResultsPanelProps) {
  const filteredResults = selectedConversation
    ? results.filter((r) => r.conversationId === selectedConversation.id)
    : []

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Test Results</h2>
          <Badge variant="secondary">{filteredResults.length}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results yet</p>
              <p className="text-sm">Test a prompt to see results here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredResults.map((result, index) => {
              const comparison = selectedConversation
                ? compareAnswers(selectedConversation.originalAnswers, result.generatedAnswers)
                : []

              const matchCount = comparison.filter((c) => c.matches).length
              const totalFields = comparison.length

              return (
                <Card key={result.timestamp} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Test #{filteredResults.length - index}</Badge>
                          <Badge variant="secondary">{result.processingTime}ms</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(result.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            matchCount === totalFields
                              ? "default"
                              : matchCount > totalFields / 2
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {matchCount}/{totalFields} matches
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(result.generatedAnswers, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {comparison.map((comp, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comp.field}</span>
                          {comp.matches ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Original:</span>
                            <p className="bg-muted p-2 rounded mt-1">{comp.original}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated:</span>
                            <p className="bg-blue-50 p-2 rounded mt-1">{comp.generated}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
