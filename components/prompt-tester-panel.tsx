"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, RotateCcw, Zap } from "lucide-react"
import type { Conversation } from "./advanced-dashboard"

interface PromptTesterPanelProps {
  onTest: (prompt: string) => Promise<void>
  selectedConversations: Conversation[]
  isLoading: boolean
}

const savedPrompts = [
  {
    id: "standard",
    name: "Standard Form Filler",
    prompt:
      "Listen to this audio recording and extract information to fill out a form. For each form field, provide the most appropriate answer based on what you hear. If information is not available, respond with 'N/A'. Return the response as a JSON object with field names as keys.",
  },
  {
    id: "detailed",
    name: "Detailed Extraction",
    prompt:
      "Analyze this audio recording carefully and extract all relevant information. Pay attention to names, contact details, preferences, and any specific requests mentioned. Format your response as a JSON object that matches the form fields exactly. Include confidence scores for each field.",
  },
  {
    id: "contextual",
    name: "Context-Aware Filler",
    prompt:
      "Listen to this conversation and understand the context before filling out the form. Consider the tone, urgency, and specific needs mentioned. Provide accurate and contextually appropriate responses for each field as a JSON object. Include reasoning for ambiguous fields.",
  },
]

export function PromptTesterPanel({ onTest, selectedConversations, isLoading }: PromptTesterPanelProps) {
  const [currentPrompt, setCurrentPrompt] = useState(savedPrompts[0].prompt)
  const [selectedPromptId, setSelectedPromptId] = useState("standard")

  const handlePromptSelect = (promptId: string) => {
    const prompt = savedPrompts.find((p) => p.id === promptId)
    if (prompt) {
      setCurrentPrompt(prompt.prompt)
      setSelectedPromptId(promptId)
    }
  }

  const handleTest = async () => {
    if (!currentPrompt.trim() || selectedConversations.length === 0) return
    await onTest(currentPrompt)
  }

  const resetPrompt = () => {
    const prompt = savedPrompts.find((p) => p.id === selectedPromptId)
    if (prompt) {
      setCurrentPrompt(prompt.prompt)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-slate-800 neon-accent">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-semibold neon-text">Prompt Tester</h2>
        </div>
        <p className="text-slate-400">Test prompts against selected conversations</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Selected Conversations Info */}
          {selectedConversations.length > 0 ? (
            <Card className="neon-accent border-emerald-400/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-emerald-400">Testing against:</span>
                  <Badge variant="outline" className="neon-border text-emerald-400">
                    {selectedConversations.length} conversations
                  </Badge>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {selectedConversations.map((conv) => (
                    <div key={conv.id} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{conv.id}</span>
                      <span>{conv.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {conv.workflow}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-orange-400/30 bg-orange-950/20">
              <CardContent className="p-4 text-center">
                <p className="text-orange-400">Select conversations from the left panel to start testing</p>
              </CardContent>
            </Card>
          )}

          {/* Prompt Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Saved Prompts</label>
            <Select value={selectedPromptId} onValueChange={handlePromptSelect}>
              <SelectTrigger className="neon-border">
                <SelectValue placeholder="Select a saved prompt" />
              </SelectTrigger>
              <SelectContent>
                {savedPrompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Prompt */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Current Prompt</label>
              <Button variant="ghost" size="sm" onClick={resetPrompt} className="text-cyan-400 hover:text-cyan-300">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <Textarea
              placeholder="Enter your prompt here..."
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="min-h-[300px] resize-none neon-border bg-slate-900/50"
            />
          </div>

          {/* Test Button */}
          <div className="space-y-3">
            <Button
              onClick={handleTest}
              disabled={!currentPrompt.trim() || selectedConversations.length === 0 || isLoading}
              className="w-full h-12 text-lg neon-glow bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Testing {selectedConversations.length} conversation{selectedConversations.length !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-3" />
                  Test Prompt ({selectedConversations.length})
                </>
              )}
            </Button>

            {selectedConversations.length === 0 && (
              <p className="text-sm text-slate-400 text-center">Select conversations to enable testing</p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
