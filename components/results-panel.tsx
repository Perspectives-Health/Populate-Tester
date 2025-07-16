"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Clock, CheckCircle, XCircle, Copy, Eye, EyeOff } from "lucide-react"
import { Conversation } from "@/lib/api"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ResultsPanelProps {
  testResult: any
  testScreenshot: string | null
  selectedConversation: Conversation | null
}

export function ResultsPanel({ testResult, testScreenshot, selectedConversation }: ResultsPanelProps) {
  console.log('ResultsPanel received testResult:', testResult)
  console.log('ResultsPanel received testScreenshot:', testScreenshot)
  
  // Parse the result properly - handle the case where result is in a 'text' field
  const parseResult = (result: any) => {
    if (!result) return null;
    
    console.log('Parsing result:', result)
    
    // If result has a 'text' field, parse that
    if (result.text) {
      let jsonString = result.text;
      
      // Remove markdown code block if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
      }
      
      try {
        const parsed = JSON.parse(jsonString);
        console.log('Successfully parsed JSON:', parsed)
        return parsed;
      } catch (error) {
        console.log('Failed to parse JSON, returning as text:', jsonString)
        // If parsing fails, return the original text
        return jsonString;
      }
    }
    
    // If result has a 'result' field, use that
    if (result.result) {
      console.log('Using result.result field:', result.result)
      return result.result;
    }
    
    // Otherwise return the result as-is
    console.log('Returning result as-is:', result)
    return result;
  };

  const parsedResult = parseResult(testResult);
  console.log('Final parsed result:', parsedResult)

  // Helper to format seconds as Xm Ys
  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="heading-2-accent">Test Result sddss</h2>
            {testResult?.total_time !== undefined && (
              <span className="text-emerald-400 font-semibold text-base bg-slate-800 rounded px-3 py-1 ml-2">
                Total Time: {formatDuration(testResult.total_time)}
              </span>
            )}
          </div>
          <Badge variant="secondary">{testResult ? 1 : 0}</Badge>
        </div>
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
        <div className="flex flex-1 gap-4 overflow-auto custom-scrollbar">
          <div className="flex-1 min-w-0">
            {/* LLM Generation Time Info */}
            {testResult?.llm_generation_time !== undefined && (
              <div className="mb-2 text-slate-400 text-sm">
                LLM Generation Time: <span className="font-semibold text-slate-200">{testResult.llm_generation_time.toFixed(2)}s</span>
              </div>
            )}
            <div className="mb-2 font-medium text-slate-300">Result JSON</div>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-2 max-h-[70vh] overflow-auto custom-scrollbar">
              <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ background: 'transparent', fontSize: 13 }}>
                {parsedResult ? JSON.stringify(parsedResult, null, 2) : '{}'}
              </SyntaxHighlighter>
            </div>
            
            {/* Log Messages Section */}
            {(parsedResult?.log_messages && parsedResult.log_messages.length > 0) || 
             (testResult?.log_messages && testResult.log_messages.length > 0) ? (
              <div className="mt-4">
                <div className="mb-2 font-medium text-slate-300">Log Messages</div>
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-[30vh] overflow-auto custom-scrollbar">
                  <div className="space-y-2">
                    {(parsedResult?.log_messages || testResult?.log_messages || []).map((message: string, index: number) => (
                      <div key={index} className="text-slate-300 text-sm border-l-2 border-cyan-500 pl-3">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {testScreenshot && (
            <div className="flex-1 min-w-[200px]">
              <div className="mb-2 font-medium text-slate-300">Screenshot</div>
              <div className="bg-slate-900 rounded-lg border border-slate-700 flex justify-center items-center max-h-[70vh] overflow-auto custom-scrollbar">
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
