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

  return (
    <div className="flex flex-col h-full p-4">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="heading-2-accent">Test Results</h2>
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
            <div className="mb-2 font-medium text-slate-300">Result JSON</div>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-2 max-h-[70vh] overflow-auto custom-scrollbar">
              <SyntaxHighlighter language="json" style={vscDarkPlus} customStyle={{ background: 'transparent', fontSize: 13 }}>
                {parsedResult ? JSON.stringify(parsedResult, null, 2) : '{}'}
              </SyntaxHighlighter>
            </div>
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
