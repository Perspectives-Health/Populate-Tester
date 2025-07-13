"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Clock, Copy, Code } from "lucide-react"
import type { TestResult, Conversation } from "./resizable-dashboard"

interface AdvancedResultsPanelProps {
  results: TestResult[]
  selectedConversations: Conversation[]
}

export function AdvancedResultsPanel({ results, selectedConversations }: AdvancedResultsPanelProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2)
  }

  const renderJSONWithSyntaxHighlighting = (jsonString: string) => {
    return jsonString.split("\n").map((line, index) => {
      let highlightedLine = line

      // Highlight keys
      highlightedLine = highlightedLine.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')

      // Highlight string values
      highlightedLine = highlightedLine.replace(/: "([^"]*)"([,}]?)/g, ': <span class="json-string">"$1"</span>$2')

      // Highlight numbers
      highlightedLine = highlightedLine.replace(/: (\d+)([,}]?)/g, ': <span class="json-number">$1</span>$2')

      // Highlight booleans
      highlightedLine = highlightedLine.replace(/: (true|false)([,}]?)/g, ': <span class="json-boolean">$1</span>$2')

      // Highlight null
      highlightedLine = highlightedLine.replace(/: (null)([,}]?)/g, ': <span class="json-null">$1</span>$2')

      return (
        <div key={index} className="font-mono text-sm">
          <span dangerouslySetInnerHTML={{ __html: highlightedLine }} />
        </div>
      )
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 neon-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold neon-text">Test Results</h2>
          </div>
          <Badge variant="secondary" className="neon-border">
            {results.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 p-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results yet</p>
              <p className="text-sm">Test a prompt to see results here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {results.map((result, index) => {
              const resultId = result.conversationId + result.timestamp

              return (
                <Card key={resultId} className="neon-accent border-l-4 border-l-emerald-400">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs neon-border">
                            Test #{results.length - index}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {result.processingTime}ms
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{formatTimestamp(result.timestamp)}</p>
                        <p className="text-xs text-slate-300 font-mono">{result.conversationId}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatJSON(result.generatedAnswers))}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                      <div className="max-h-60 overflow-y-auto">
                        {renderJSONWithSyntaxHighlighting(formatJSON(result.generatedAnswers))}
                      </div>
                    </div>
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
