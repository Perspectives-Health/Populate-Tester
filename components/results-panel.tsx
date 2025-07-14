"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, Copy, Eye, EyeOff } from "lucide-react"
import type { TestResult, Conversation } from "./conversations-dashboard"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ResultsPanelProps {
  testResult: any
  testScreenshot: string | null
  selectedConversation: Conversation | null
}

export function ResultsPanel({ testResult, testScreenshot, selectedConversation }: ResultsPanelProps) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-emerald-400">Test Results</h2>
      </div>
      {(!testResult && !testScreenshot) ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <span className="block text-4xl mb-2">🕒</span>
            <p>No results yet</p>
            <p className="text-sm">Test a prompt to see results here</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-auto">
          <div className="flex-1 min-w-0">
            <div className="mb-2 font-medium text-slate-300">Result JSON</div>
            <div className="bg-slate-900 rounded p-2 max-h-[70vh] overflow-auto">
              <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ background: 'transparent', fontSize: 13 }}>
                {testResult ? JSON.stringify(testResult, null, 2) : '{}'}
              </SyntaxHighlighter>
            </div>
          </div>
          {testScreenshot && (
            <div className="flex-1 min-w-[200px]">
              <div className="mb-2 font-medium text-slate-300">Screenshot</div>
              <div className="bg-slate-900 rounded flex justify-center items-center max-h-[70vh] overflow-auto">
                <img
                  src={testScreenshot}
                  alt="Screenshot"
                  className="max-w-full max-h-[60vh] object-contain cursor-zoom-in"
                  style={{ display: 'block', margin: '0 auto' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
