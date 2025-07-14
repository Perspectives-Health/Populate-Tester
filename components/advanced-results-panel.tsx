"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Clock, Copy, Code, Image as ImageIcon } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface AdvancedResultsPanelProps {
  results: any[]
  selectedConversation: any
  onClear: () => void
  isPending: boolean
}

export function AdvancedResultsPanel({ results, selectedConversation, onClear, isPending }: AdvancedResultsPanelProps) {
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 neon-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold neon-text">Test Results</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="neon-border">
              {results.length}
            </Badge>
            <Button size="sm" variant="outline" onClick={onClear}>Clear</Button>
            {isPending && <span className="ml-2 text-yellow-400">Running...</span>}
          </div>
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
              // Defensive: allow for new result shape and nulls
              let key = "result-" + index;
              if (result && (result.timestamp || result.time || result.created_at)) {
                key = String(result.timestamp || result.time || result.created_at) + index;
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
                <Card key={key} className="neon-accent border-l-4 border-l-emerald-400">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs neon-border">
                            Test #{results.length - index}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {result && result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatJSON(json))}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-4">
                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4" style={{ boxSizing: 'border-box' }}>
                        <SyntaxHighlighter
                          language="json"
                          style={vscDarkPlus}
                          customStyle={{ background: 'transparent', fontSize: 13, margin: 0, padding: 0, boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {typeof prettyJson === 'string' ? prettyJson : JSON.stringify(prettyJson, null, 2)}
                        </SyntaxHighlighter>
                      </div>
                      {screenshot && (
                        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                          <div className="mb-2 flex items-center gap-1 text-xs text-slate-400"><ImageIcon className="h-4 w-4" /> Screenshot</div>
                          <div className="border border-slate-700 rounded-lg overflow-hidden bg-black">
                            <img
                              src={screenshot}
                              alt="Test Screenshot"
                              className="max-h-60 max-w-full object-contain"
                              style={{ background: "#000" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
      {/* Add global style to fix syntax highlighter padding */}
      <style jsx global>{`
        /* Fix react-syntax-highlighter padding issue */
        pre[class*='language-'] {
          padding-left: 16px !important;
          padding-right: 16px !important;
          box-sizing: border-box !important;
        }
      `}</style>
    </div>
  )
}
